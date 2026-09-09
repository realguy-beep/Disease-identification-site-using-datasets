import type { LoomRPCRequest, LoomRPCResponse } from '../types/rpc';
import type { LoomCapability } from '../types/manifest';
import { db } from './db';
import type { StateItem } from '../types/state';
import { 
  getDirectoryContents, 
  createFile, 
  createFolder, 
  updateFileContent, 
  moveToTrash, 
  restoreFromTrash, 
  getStorageQuota 
} from './vfs';

interface ActiveSession {
  token: string;
  appId: string;
  cardId: string;
}

class RPCBroker {
  private activeSessions = new Map<string, ActiveSession>();
  private isListening = false;
  private onStateChangeListeners = new Set<() => void>();
  private onNotificationListeners = new Set<(notif: { title: string; message: string; appId: string }) => void>();
  private appNotificationTimes = new Map<string, number[]>();

  public registerSession(cardId: string, appId: string, token: string) {
    this.activeSessions.set(token, { token, appId, cardId });
  }

  public unregisterSession(token: string) {
    this.activeSessions.delete(token);
  }

  public onStateChange(callback: () => void) {
    this.onStateChangeListeners.add(callback);
    return () => this.onStateChangeListeners.delete(callback);
  }

  public onNotification(callback: (notif: { title: string; message: string; appId: string }) => void) {
    this.onNotificationListeners.add(callback);
    return () => this.onNotificationListeners.delete(callback);
  }

  private notifyStateChanged() {
    this.onStateChangeListeners.forEach(cb => {
      try { cb(); } catch (e) { console.error(e); }
    });
  }

  private notifyAppNotification(title: string, message: string, appId: string) {
    this.onNotificationListeners.forEach(cb => {
      try { cb({ title, message, appId }); } catch (e) { console.error(e); }
    });
  }

  public startListening() {
    if (this.isListening) return;
    window.addEventListener('message', this.handleMessage);
    this.isListening = true;
  }

  public stopListening() {
    window.removeEventListener('message', this.handleMessage);
    this.isListening = false;
  }

  private handleMessage = async (event: MessageEvent) => {
    const rawData = event.data;
    if (!rawData || typeof rawData !== 'object' || rawData.jsonrpc !== '2.0') {
      return; // Ignore non-Loom RPC messages
    }

    const req = rawData as LoomRPCRequest;
    const sourceWindow = event.source as WindowProxy | null;

    const sendResponse = (resp: LoomRPCResponse) => {
      if (sourceWindow) {
        sourceWindow.postMessage(resp, '*');
      }
    };

    // 1. Validate Session Token
    const session = this.activeSessions.get(req.token);
    if (!session || session.appId !== req.appId) {
      sendResponse({
        jsonrpc: '2.0',
        id: req.id,
        success: false,
        error: {
          code: 401,
          message: 'UNAUTHORIZED: Invalid or expired session token for this app card instance'
        }
      });
      return;
    }

    // 2. Fetch App Capabilities
    const app = await db.installedApps.get(req.appId);
    if (!app) {
      sendResponse({
        jsonrpc: '2.0',
        id: req.id,
        success: false,
        error: {
          code: 404,
          message: `App with id "${req.appId}" not found in installed apps registry`
        }
      });
      return;
    }

    const permissions = new Set(app.permissions || []);

    // 3. Capability Enforcement Matrix
    const requiredCapability = this.getRequiredCapability(req.method);
    if (requiredCapability && !permissions.has(requiredCapability)) {
      sendResponse({
        jsonrpc: '2.0',
        id: req.id,
        success: false,
        error: {
          code: 403,
          message: `PERMISSION_DENIED: App requires capability "${requiredCapability}" for method "${req.method}"`
        }
      });
      return;
    }

    // 4. Method Dispatching
    try {
      const result = await this.executeMethod(req, session.appId);
      sendResponse({
        jsonrpc: '2.0',
        id: req.id,
        success: true,
        result
      });
    } catch (err: any) {
      sendResponse({
        jsonrpc: '2.0',
        id: req.id,
        success: false,
        error: {
          code: 500,
          message: err.message || 'Internal RPC execution error'
        }
      });
    }
  };

  private getRequiredCapability(method: LoomRPCRequest['method']): LoomCapability | null {
    switch (method) {
      case 'storage:get':
        return 'storage:read';
      case 'storage:set':
      case 'storage:delete':
        return 'storage:write';
      case 'clipboard:read':
        return 'clipboard:read';
      case 'clipboard:write':
        return 'clipboard:write';
      case 'state:query':
        return 'state:read';
      case 'state:create':
      case 'state:update':
      case 'state:delete':
        return 'state:write';
      case 'vfs:list':
      case 'vfs:quota':
        return 'vfs:read';
      case 'vfs:createFile':
      case 'vfs:createFolder':
      case 'vfs:updateFile':
      case 'vfs:trash':
      case 'vfs:restore':
        return 'vfs:write';
      case 'notification:show':
        return 'notification';
      case 'loom:handshake':
      case 'loom:getAppInfo':
        return null;
      default:
        return null;
    }
  }

  private async executeMethod(req: LoomRPCRequest, appId: string): Promise<any> {
    const params = req.params || {};

    switch (req.method) {
      case 'loom:handshake': {
        const app = await db.installedApps.get(appId);
        return {
          appId,
          name: app?.name,
          permissions: app?.permissions,
          ready: true,
          theme: 'dark'
        };
      }

      case 'loom:getAppInfo': {
        return await db.installedApps.get(appId);
      }

      // --- Scoped Storage: Strictly isolated per appId ---
      case 'storage:get': {
        const key = String(params.key || '');
        const record = await db.appStorage.where({ appId, key }).first();
        return record ? record.value : null;
      }

      case 'storage:set': {
        const key = String(params.key || '');
        const value = params.value;
        const existing = await db.appStorage.where({ appId, key }).first();
        if (existing && existing.id) {
          await db.appStorage.update(existing.id, { value, updatedAt: Date.now() });
        } else {
          await db.appStorage.add({ appId, key, value, updatedAt: Date.now() });
        }
        return { saved: true, key };
      }

      case 'storage:delete': {
        const key = String(params.key || '');
        await db.appStorage.where({ appId, key }).delete();
        return { deleted: true, key };
      }

      // --- Clipboard Operations ---
      case 'clipboard:read': {
        try {
          const text = await navigator.clipboard.readText();
          return { text };
        } catch (e) {
          const snippet = await db.stateItems.where('type').equals('snippet').first();
          return { text: snippet?.content || '' };
        }
      }

      case 'clipboard:write': {
        const text = String(params.text || '');
        try {
          await navigator.clipboard.writeText(text);
        } catch (e) {}
        return { success: true, length: text.length };
      }

      // --- Universal State Layer ---
      case 'state:query': {
        let collection = db.stateItems.toCollection();
        if (params.type) {
          collection = db.stateItems.where('type').equals(params.type);
        }
        let items = await collection.reverse().sortBy('updatedAt');
        if (params.tag) {
          items = items.filter(item => item.tags && item.tags.includes(params.tag));
        }
        if (params.search) {
          const query = String(params.search).toLowerCase();
          items = items.filter(item => 
            item.title.toLowerCase().includes(query) || 
            item.content.toLowerCase().includes(query)
          );
        }
        return { items };
      }

      case 'state:create': {
        const newItem: StateItem = {
          id: params.id || `state-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: params.type || 'note',
          title: params.title || 'Untitled',
          content: params.content || '',
          tags: Array.isArray(params.tags) ? params.tags : [],
          links: Array.isArray(params.links) ? params.links : [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          metadata: params.metadata || {}
        };
        await db.stateItems.add(newItem);
        this.notifyStateChanged();
        return { success: true, item: newItem };
      }

      case 'state:update': {
        const { id, ...updates } = params;
        if (!id) throw new Error('state:update requires an item id');
        await db.stateItems.update(id, {
          ...updates,
          updatedAt: Date.now()
        });
        this.notifyStateChanged();
        return { success: true, id };
      }

      case 'state:delete': {
        const id = String(params.id || '');
        if (!id) throw new Error('state:delete requires an item id');
        await db.stateItems.delete(id);
        this.notifyStateChanged();
        return { success: true, id };
      }

      // --- Virtual File System (VFS) Operations ---
      case 'vfs:list': {
        const parentId = params.parentId !== undefined ? params.parentId : null;
        const isTrash = Boolean(params.isTrash);
        const items = await getDirectoryContents(parentId, undefined, isTrash);
        const quota = await getStorageQuota();
        return { items, quota };
      }

      case 'vfs:createFile': {
        const node = await createFile(params.name, params.parentId, params.content, params.mimeType);
        return { success: true, node };
      }

      case 'vfs:createFolder': {
        const node = await createFolder(params.name, params.parentId);
        return { success: true, node };
      }

      case 'vfs:updateFile': {
        await updateFileContent(params.id, params.content || '');
        return { success: true, id: params.id };
      }

      case 'vfs:trash': {
        await moveToTrash(params.id);
        return { success: true, id: params.id };
      }

      case 'vfs:restore': {
        await restoreFromTrash(params.id);
        return { success: true, id: params.id };
      }

      case 'vfs:quota': {
        return await getStorageQuota();
      }

      // --- Notifications with Rate-Limiting & DND ---
      case 'notification:show': {
        const now = Date.now();
        const windowMs = 30000;
        const maxNotifs = 3;

        // Rate limiting check
        const timestamps = this.appNotificationTimes.get(appId) || [];
        const recent = timestamps.filter(t => now - t < windowMs);
        if (recent.length >= maxNotifs) {
          throw new Error(`RATE_LIMIT_EXCEEDED: App "${appId}" exceeded notification rate limit (max ${maxNotifs} per 30s)`);
        }
        recent.push(now);
        this.appNotificationTimes.set(appId, recent);

        const title = String(params.title || 'Loom Notification');
        const message = String(params.message || '');
        const notifId = `notif-${now}-${Math.random().toString(36).slice(2, 6)}`;

        // Persistent history saving
        await db.notifications.add({
          id: notifId,
          title,
          message,
          appId,
          timestamp: now,
          read: false
        });

        // Suppress audio/visual popup if DND active
        const settings = await db.settings.get('current_settings');
        if (!settings?.dnd) {
          this.notifyAppNotification(title, message, appId);
        }

        return { delivered: true, id: notifId };
      }

      default:
        throw new Error(`Unknown method "${req.method}"`);
    }
  }
}

export const rpcBroker = new RPCBroker();
