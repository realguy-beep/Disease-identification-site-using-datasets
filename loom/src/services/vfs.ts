import { db } from './db';
import type { VFSNode, VFSQuota } from '../types/vfs';

export const MAX_VFS_QUOTA_BYTES = 50 * 1024 * 1024; // 50 MB local quota

export const DEFAULT_VFS_NODES: VFSNode[] = [
  {
    id: 'folder-documents',
    parentId: null,
    name: 'Documents',
    type: 'folder',
    size: 0,
    isTrash: false,
    createdAt: Date.now() - 500000,
    updatedAt: Date.now() - 500000
  },
  {
    id: 'folder-pictures',
    parentId: null,
    name: 'Pictures',
    type: 'folder',
    size: 0,
    isTrash: false,
    createdAt: Date.now() - 500000,
    updatedAt: Date.now() - 500000
  },
  {
    id: 'folder-code',
    parentId: null,
    name: 'Code',
    type: 'folder',
    size: 0,
    isTrash: false,
    createdAt: Date.now() - 500000,
    updatedAt: Date.now() - 500000
  },
  {
    id: 'file-welcome-doc',
    parentId: 'folder-documents',
    name: 'Loom-Architecture.md',
    type: 'file',
    content: '# Loom Web OS Architecture\n\nLoom combines a sandboxed iframe runtime with an adaptive, context-driven desktop canvas.\n\n- Local-first IndexedDB via Dexie.js\n- Capability-gated postMessage RPC\n- Flat Universal State + Hierarchical Virtual File System\n- Multi-user profiles with passphrase encryption',
    size: 320,
    mimeType: 'text/markdown',
    isTrash: false,
    createdAt: Date.now() - 400000,
    updatedAt: Date.now() - 400000
  },
  {
    id: 'file-sample-script',
    parentId: 'folder-code',
    name: 'loom-hello.js',
    type: 'file',
    content: '// Loom SDK Demo\nconsole.log("Hello from Loom Sandboxed App!");\nLoomSDK.notify("Loom OS", "Script executed inside secure sandbox");',
    size: 140,
    mimeType: 'application/javascript',
    isTrash: false,
    createdAt: Date.now() - 300000,
    updatedAt: Date.now() - 300000
  }
];

export async function getDirectoryContents(parentId: string | null = null, userId?: string, includeTrash = false): Promise<VFSNode[]> {
  let collection = db.vfsNodes.toCollection();
  let nodes = await collection.toArray();

  return nodes.filter(node => {
    if (includeTrash) {
      return node.isTrash;
    }
    if (node.isTrash) return false;
    if (userId && node.userId && node.userId !== userId) return false;
    return node.parentId === parentId;
  });
}

export async function getVFSNode(id: string): Promise<VFSNode | undefined> {
  return await db.vfsNodes.get(id);
}

export async function createFile(
  name: string, 
  parentId: string | null = null, 
  content: string = '', 
  mimeType: string = 'text/plain',
  userId?: string
): Promise<VFSNode> {
  const encoder = new TextEncoder();
  const size = encoder.encode(content).length;

  const node: VFSNode = {
    id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    parentId,
    name: name.trim() || 'Untitled',
    type: 'file',
    content,
    size,
    mimeType,
    isTrash: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    userId
  };

  await db.vfsNodes.add(node);
  return node;
}

export async function createFolder(
  name: string, 
  parentId: string | null = null,
  userId?: string
): Promise<VFSNode> {
  const node: VFSNode = {
    id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    parentId,
    name: name.trim() || 'New Folder',
    type: 'folder',
    size: 0,
    isTrash: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    userId
  };

  await db.vfsNodes.add(node);
  return node;
}

export async function updateFileContent(id: string, content: string): Promise<void> {
  const encoder = new TextEncoder();
  const size = encoder.encode(content).length;
  await db.vfsNodes.update(id, { content, size, updatedAt: Date.now() });
}

export async function renameNode(id: string, newName: string): Promise<void> {
  await db.vfsNodes.update(id, { name: newName.trim(), updatedAt: Date.now() });
}

export async function moveToTrash(id: string): Promise<void> {
  await db.vfsNodes.update(id, { isTrash: true, updatedAt: Date.now() });
}

export async function restoreFromTrash(id: string): Promise<void> {
  await db.vfsNodes.update(id, { isTrash: false, updatedAt: Date.now() });
}

export async function emptyTrash(userId?: string): Promise<void> {
  const trashNodes = await db.vfsNodes.where('isTrash').equals(1 as any).toArray();
  const toDelete = trashNodes.filter(n => !userId || !n.userId || n.userId === userId);
  await db.vfsNodes.bulkDelete(toDelete.map(n => n.id));
}

export async function deleteNodePermanently(id: string): Promise<void> {
  await db.vfsNodes.delete(id);
}

export async function getStorageQuota(userId?: string): Promise<VFSQuota> {
  const nodes = await db.vfsNodes.toArray();
  const userNodes = nodes.filter(n => !userId || !n.userId || n.userId === userId);
  
  const usedBytes = userNodes.reduce((acc, curr) => acc + (curr.size || 0), 0);
  const fileCount = userNodes.filter(n => n.type === 'file').length;
  const folderCount = userNodes.filter(n => n.type === 'folder').length;

  return {
    usedBytes,
    maxBytes: MAX_VFS_QUOTA_BYTES,
    fileCount,
    folderCount
  };
}

export async function importRealFile(file: File, parentId: string | null = null, userId?: string): Promise<VFSNode> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const isText = file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.js') || file.name.endsWith('.ts');

    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const node = await createFile(file.name, parentId, content, file.type || 'application/octet-stream', userId);
        resolve(node);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read uploaded file'));

    if (isText) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  });
}

export async function exportVFSFile(id: string): Promise<void> {
  const node = await db.vfsNodes.get(id);
  if (!node || node.type !== 'file') return;

  let blob: Blob;
  if (node.content?.startsWith('data:')) {
    // Base64 file
    const res = await fetch(node.content);
    blob = await res.blob();
  } else {
    blob = new Blob([node.content || ''], { type: node.mimeType || 'text/plain' });
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = node.name;
  a.click();
  URL.revokeObjectURL(url);
}

