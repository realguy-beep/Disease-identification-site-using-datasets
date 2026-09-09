import Dexie, { type Table } from 'dexie';
import type { StateItem } from '../types/state';
import type { InstalledApp } from '../types/manifest';
import type { ZoneDefinition } from '../types/zone';
import type { CardInstance } from '../types/card';
import type { ScopedStorageRecord } from '../types/rpc';
import type { VFSNode } from '../types/vfs';
import type { LoomNotification } from '../types/notification';
import type { UserProfile } from '../types/auth';
import type { LoomSettings } from '../types/settings';
import { DEFAULT_SETTINGS } from '../types/settings';
import { DEFAULT_VFS_NODES } from './vfs';

export class LoomDatabase extends Dexie {
  stateItems!: Table<StateItem, string>;
  installedApps!: Table<InstalledApp, string>;
  zones!: Table<ZoneDefinition, string>;
  cards!: Table<CardInstance, string>;
  appStorage!: Table<ScopedStorageRecord, number>;
  vfsNodes!: Table<VFSNode, string>;
  notifications!: Table<LoomNotification, string>;
  profiles!: Table<UserProfile, string>;
  settings!: Table<LoomSettings, string>;

  constructor() {
    super('LoomOS_Database');
    
    this.version(1).stores({
      stateItems: '&id, type, title, *tags, createdAt, updatedAt',
      installedApps: '&id, name, installedAt',
      zones: '&id, name, isDefault',
      cards: '&id, appId, zoneId',
      appStorage: '++id, [appId+key], appId, key, updatedAt'
    });

    this.version(2).stores({
      stateItems: '&id, type, title, *tags, createdAt, updatedAt',
      installedApps: '&id, name, installedAt',
      zones: '&id, name, isDefault',
      cards: '&id, appId, zoneId',
      appStorage: '++id, [appId+key], appId, key, updatedAt',
      vfsNodes: '&id, parentId, name, type, isTrash, userId, updatedAt',
      notifications: '&id, appId, timestamp, read',
      profiles: '&id, username, isGuest, createdAt',
      settings: '&id'
    });
  }
}

export const db = new LoomDatabase();

// Default seeds
export const DEFAULT_ZONES: ZoneDefinition[] = [
  {
    id: 'morning',
    name: 'Morning Zone',
    description: 'Fresh start, morning brief, ideas capture & clipboard review',
    icon: 'Sun',
    timeStart: '05:00',
    timeEnd: '12:00',
    defaultAppIds: ['loom.notes', 'loom.clipboard', 'loom.files'],
    accentColor: '#f59e0b',
    ambientGradient: 'radial-gradient(ellipse at 15% 15%, rgba(245, 158, 11, 0.12) 0%, rgba(99, 102, 241, 0.04) 50%, transparent 80%)',
    isDefault: true
  },
  {
    id: 'focus',
    name: 'Focus Zone',
    description: 'Deep work sprint, task execution, terminal & snippets reference',
    icon: 'Zap',
    timeStart: '12:00',
    timeEnd: '18:00',
    defaultAppIds: ['loom.tasks', 'loom.notes', 'loom.terminal'],
    accentColor: '#6366f1',
    ambientGradient: 'radial-gradient(ellipse at 50% 15%, rgba(99, 102, 241, 0.15) 0%, rgba(14, 165, 233, 0.05) 50%, transparent 80%)',
    isDefault: true
  },
  {
    id: 'evening',
    name: 'Evening Zone',
    description: 'Daily reflection, reading log & wind-down planning',
    icon: 'Moon',
    timeStart: '18:00',
    timeEnd: '05:00',
    defaultAppIds: ['loom.notes', 'loom.clipboard'],
    accentColor: '#8b5cf6',
    ambientGradient: 'radial-gradient(ellipse at 85% 20%, rgba(139, 92, 246, 0.14) 0%, rgba(236, 72, 153, 0.05) 50%, transparent 80%)',
    isDefault: true
  }
];

export const DEFAULT_APPS: InstalledApp[] = [
  {
    id: 'loom.notes',
    name: 'Notes Canvas',
    version: '1.0.0',
    description: 'Universal markdown scratchpad with live auto-save & cross-linking',
    icon: 'FileText',
    url: '/apps/notes.html',
    permissions: ['storage:read', 'storage:write', 'state:read', 'state:write'],
    installedAt: Date.now(),
    isBuiltin: true,
    trusted: true,
    themeColor: '#6366f1'
  },
  {
    id: 'loom.clipboard',
    name: 'Clipboard Vault',
    version: '1.0.0',
    description: 'Real-time clipboard manager, code snippets, and quick history',
    icon: 'Clipboard',
    url: '/apps/clipboard.html',
    permissions: ['clipboard:read', 'clipboard:write', 'storage:read', 'storage:write'],
    installedAt: Date.now(),
    isBuiltin: true,
    trusted: true,
    themeColor: '#10b981'
  },
  {
    id: 'loom.tasks',
    name: 'Task Flow',
    version: '1.0.0',
    description: 'Contextual task pipeline with priorities and universal state sync',
    icon: 'CheckSquare',
    url: '/apps/tasks.html',
    permissions: ['state:read', 'state:write', 'storage:read', 'storage:write', 'notification'],
    installedAt: Date.now(),
    isBuiltin: true,
    trusted: true,
    themeColor: '#f59e0b'
  },
  {
    id: 'loom.files',
    name: 'Virtual Files',
    version: '1.0.0',
    description: 'Hierarchical file manager with upload, download, and recycle bin',
    icon: 'Folder',
    url: '/apps/files.html',
    permissions: ['vfs:read', 'vfs:write', 'storage:read', 'storage:write', 'notification'],
    installedAt: Date.now(),
    isBuiltin: true,
    trusted: true,
    themeColor: '#3b82f6'
  },
  {
    id: 'loom.terminal',
    name: 'OS Terminal',
    version: '1.0.0',
    description: 'Safe scriptable CLI environment for Loom system commands and files',
    icon: 'Terminal',
    url: '/apps/terminal.html',
    permissions: ['vfs:read', 'vfs:write', 'state:read', 'state:write', 'storage:read', 'storage:write'],
    installedAt: Date.now(),
    isBuiltin: true,
    trusted: true,
    themeColor: '#10b981'
  },
  {
    id: 'loom.settings',
    name: 'System Settings',
    version: '1.0.0',
    description: 'Customise themes, manage app capabilities, and view storage usage',
    icon: 'Settings',
    url: '/apps/settings.html',
    permissions: ['storage:read', 'storage:write', 'notification'],
    installedAt: Date.now(),
    isBuiltin: true,
    trusted: true,
    themeColor: '#94a3b8'
  },
  {
    id: 'loom.taskmanager',
    name: 'Task Manager',
    version: '1.0.0',
    description: 'Monitor running cards, resource metrics, and force-quit unresponsive apps',
    icon: 'Activity',
    url: '/apps/taskmanager.html',
    permissions: ['storage:read', 'storage:write'],
    installedAt: Date.now(),
    isBuiltin: true,
    trusted: true,
    themeColor: '#ef4444'
  },
  {
    id: 'loom.security',
    name: 'Sandbox Auditor',
    version: '1.0.0',
    description: 'Live test harness verifying iframe sandbox boundaries & capability denials',
    icon: 'ShieldAlert',
    url: '/apps/security-tester.html',
    permissions: ['storage:read', 'storage:write'],
    installedAt: Date.now(),
    isBuiltin: true,
    trusted: true,
    themeColor: '#38bdf8'
  },
  {
    id: 'loom.calculator',
    name: 'Calculator',
    version: '1.0.0',
    description: 'Standard & scientific calculation engine with tape history',
    icon: 'Calculator',
    url: '/apps/calculator.html',
    permissions: ['clipboard:write'],
    installedAt: Date.now(),
    isBuiltin: true,
    trusted: true,
    themeColor: '#818cf8'
  },
  {
    id: 'loom.timer',
    name: 'Clock & Timer',
    version: '1.0.0',
    description: 'Precision stopwatch with lap splits, countdown timers, and alarms',
    icon: 'Clock',
    url: '/apps/timer.html',
    permissions: ['notification', 'storage:read', 'storage:write'],
    installedAt: Date.now(),
    isBuiltin: true,
    trusted: true,
    themeColor: '#f59e0b'
  },
  {
    id: 'loom.editor',
    name: 'Code Editor',
    version: '1.0.0',
    description: 'Code & text editor with line numbers, syntax highlighting & VFS I/O',
    icon: 'Code',
    url: '/apps/editor.html',
    permissions: ['vfs:read', 'vfs:write', 'clipboard:read', 'clipboard:write'],
    installedAt: Date.now(),
    isBuiltin: true,
    trusted: true,
    themeColor: '#06b6d4'
  },
  {
    id: 'loom.calendar',
    name: 'Calendar',
    version: '1.0.0',
    description: 'Schedule planner, month/week views, and universal agenda sync',
    icon: 'Calendar',
    url: '/apps/calendar.html',
    permissions: ['state:read', 'state:write', 'notification'],
    installedAt: Date.now(),
    isBuiltin: true,
    trusted: true,
    themeColor: '#ec4899'
  },
  {
    id: 'loom.photos',
    name: 'Photo Gallery',
    version: '1.0.0',
    description: 'Image viewer with pan, zoom, rotation, metadata inspector & slideshow',
    icon: 'Image',
    url: '/apps/photos.html',
    permissions: ['vfs:read', 'vfs:write'],
    installedAt: Date.now(),
    isBuiltin: true,
    trusted: true,
    themeColor: '#8b5cf6'
  },
  {
    id: 'loom.player',
    name: 'Media Player',
    version: '1.0.0',
    description: 'Audio and video player with real-time waveform visualizer & playlists',
    icon: 'PlayCircle',
    url: '/apps/player.html',
    permissions: ['vfs:read'],
    installedAt: Date.now(),
    isBuiltin: true,
    trusted: true,
    themeColor: '#10b981'
  },
  {
    id: 'loom.weather',
    name: 'Weather',
    version: '1.0.0',
    description: 'Local and multi-city forecast radar with offline simulation fallback',
    icon: 'CloudSun',
    url: '/apps/weather.html',
    permissions: ['storage:read', 'storage:write'],
    installedAt: Date.now(),
    isBuiltin: true,
    trusted: true,
    themeColor: '#38bdf8'
  },
  {
    id: 'loom.sysinfo',
    name: 'System Info',
    version: '1.0.0',
    description: 'Loom OS version diagnostics, storage quota ring, and host hardware specs',
    icon: 'Cpu',
    url: '/apps/sysinfo.html',
    permissions: ['storage:read'],
    installedAt: Date.now(),
    isBuiltin: true,
    trusted: true,
    themeColor: '#a855f7'
  }
];

export const DEFAULT_STATE_ITEMS: StateItem[] = [
  {
    id: 'state-1',
    type: 'note',
    title: 'Welcome to Loom OS',
    content: 'Loom replaces traditional icon desktop paradigms with an adaptive, context-driven canvas. Everything is saved locally via IndexedDB with Dexie.js.\n\nKey shortcuts:\n- **Cmd/Ctrl + K**: Open Spotlight Search\n- **Alt + Tab**: Fast App Switcher\n- **Drag & Resize**: Move cards freely or snap to grid\n- **Zones**: Seamlessly transition from Morning to Focus to Evening',
    tags: ['welcome', 'loom', 'guide'],
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000
  },
  {
    id: 'state-2',
    type: 'task',
    title: 'Explore Loom sandboxed app capability system',
    content: 'Verify that third-party apps run in strict sandboxed iframes without DOM or cross-origin access, governed by typed postMessage capability RPC.',
    tags: ['security', 'sandbox', 'audit'],
    links: ['state-1'],
    createdAt: Date.now() - 2500000,
    updatedAt: Date.now() - 2500000,
    metadata: { completed: false, priority: 'high' }
  },
  {
    id: 'state-3',
    type: 'snippet',
    title: 'Loom RPC Handshake Spec',
    content: 'window.parent.postMessage({\n  jsonrpc: "2.0",\n  id: crypto.randomUUID(),\n  token: sessionToken,\n  appId: "my.app",\n  method: "storage:get",\n  params: { key: "settings" }\n}, "*");',
    tags: ['rpc', 'developer', 'architecture'],
    links: ['state-2'],
    createdAt: Date.now() - 1200000,
    updatedAt: Date.now() - 1200000
  },
  {
    id: 'state-4',
    type: 'link',
    title: 'Dexie.js Offline Database Documentation',
    content: 'https://dexie.org - Minimalist IndexedDB wrapper providing reactive queries and transactions.',
    tags: ['docs', 'localfirst'],
    createdAt: Date.now() - 600000,
    updatedAt: Date.now() - 600000
  }
];

export const DEFAULT_PRIMARY_PROFILE: UserProfile = {
  id: 'user-primary',
  username: 'loom_user',
  displayName: 'Loom Operator',
  avatar: 'indigo',
  passwordHash: '', // default no password set; user can set in settings
  isGuest: false,
  createdAt: Date.now()
};

export async function initializeDatabase() {
  try {
    const zonesCount = await db.zones.count();
    if (zonesCount === 0) {
      await db.zones.bulkAdd(DEFAULT_ZONES);
    }

    const appsCount = await db.installedApps.count();
    if (appsCount === 0) {
      await db.installedApps.bulkAdd(DEFAULT_APPS);
    } else {
      // Upsert new default apps if missing
      for (const app of DEFAULT_APPS) {
        const exists = await db.installedApps.get(app.id);
        if (!exists) {
          await db.installedApps.add(app);
        }
      }
    }

    const stateCount = await db.stateItems.count();
    if (stateCount === 0) {
      await db.stateItems.bulkAdd(DEFAULT_STATE_ITEMS);
    }

    const vfsCount = await db.vfsNodes.count();
    if (vfsCount === 0) {
      await db.vfsNodes.bulkAdd(DEFAULT_VFS_NODES);
    }

    const profileCount = await db.profiles.count();
    if (profileCount === 0) {
      await db.profiles.add(DEFAULT_PRIMARY_PROFILE);
    }

    const settingsCount = await db.settings.count();
    if (settingsCount === 0) {
      await db.settings.add(DEFAULT_SETTINGS);
    }
  } catch (error) {
    console.error('Failed to initialize database defaults:', error);
  }
}
