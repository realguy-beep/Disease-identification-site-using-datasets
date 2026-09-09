import type { AppManifest } from '../types/manifest';

export interface AppStoreItem extends AppManifest {
  category: 'Productivity' | 'Utilities' | 'Developer' | 'System';
  featured?: boolean;
  rating: number;
  downloads: string;
}

export const APP_STORE_CATALOG: AppStoreItem[] = [
  {
    id: 'store.zen-editor',
    name: 'Zen Markdown Studio',
    version: '2.1.0',
    description: 'Distraction-free ambient text and markdown editor with full offline persistence.',
    icon: 'FileText',
    url: '/apps/notes.html',
    category: 'Productivity',
    featured: true,
    rating: 4.9,
    downloads: '12.4k',
    permissions: ['storage:read', 'storage:write', 'state:read', 'state:write'],
    themeColor: '#6366f1'
  },
  {
    id: 'store.task-flow',
    name: 'Task Flow Pro',
    version: '1.4.0',
    description: 'Context-aware task board with priority badges and real-time state synchronization.',
    icon: 'CheckSquare',
    url: '/apps/tasks.html',
    category: 'Productivity',
    featured: true,
    rating: 4.8,
    downloads: '18.2k',
    permissions: ['state:read', 'state:write', 'storage:read', 'storage:write', 'notification'],
    themeColor: '#f59e0b'
  },
  {
    id: 'store.virtual-files',
    name: 'Virtual Files Explorer',
    version: '1.2.0',
    description: 'Hierarchical virtual filesystem manager with upload, download, and recycle bin.',
    icon: 'Folder',
    url: '/apps/files.html',
    category: 'System',
    featured: true,
    rating: 4.9,
    downloads: '24.1k',
    permissions: ['vfs:read', 'vfs:write', 'storage:read', 'storage:write', 'notification'],
    themeColor: '#3b82f6'
  },
  {
    id: 'store.os-terminal',
    name: 'Loom OS Terminal',
    version: '1.0.0',
    description: 'Interactive command-line interface to explore virtual storage and manage OS tasks.',
    icon: 'Terminal',
    url: '/apps/terminal.html',
    category: 'Developer',
    featured: false,
    rating: 4.7,
    downloads: '8.9k',
    permissions: ['vfs:read', 'vfs:write', 'state:read', 'state:write', 'storage:read', 'storage:write'],
    themeColor: '#10b981'
  },
  {
    id: 'store.clipboard-vault',
    name: 'Clipboard Vault',
    version: '1.1.0',
    description: 'Persistent clipboard history buffer with quick copy and tagging.',
    icon: 'Clipboard',
    url: '/apps/clipboard.html',
    category: 'Utilities',
    featured: false,
    rating: 4.8,
    downloads: '15.3k',
    permissions: ['clipboard:read', 'clipboard:write', 'storage:read', 'storage:write'],
    themeColor: '#10b981'
  },
  {
    id: 'store.sandbox-auditor',
    name: 'Sandbox & Capability Auditor',
    version: '1.0.0',
    description: 'Live test suite to verify iframe security boundaries, DOM isolation, and RPC capability denials.',
    icon: 'ShieldAlert',
    url: '/apps/security-tester.html',
    category: 'System',
    featured: false,
    rating: 5.0,
    downloads: '5.1k',
    permissions: ['storage:read', 'storage:write'],
    themeColor: '#38bdf8'
  },
  {
    id: 'store.task-manager',
    name: 'Process & Task Manager',
    version: '1.0.0',
    description: 'Inspect running cards, view CPU/RAM usage meters, and force-quit unresponsive apps.',
    icon: 'Activity',
    url: '/apps/taskmanager.html',
    category: 'System',
    featured: false,
    rating: 4.6,
    downloads: '7.4k',
    permissions: ['storage:read', 'storage:write'],
    themeColor: '#ef4444'
  }
];

