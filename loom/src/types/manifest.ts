export type LoomCapability = 
  | 'storage:read'
  | 'storage:write'
  | 'clipboard:read'
  | 'clipboard:write'
  | 'state:read'
  | 'state:write'
  | 'vfs:read'
  | 'vfs:write'
  | 'notification';

export interface AppManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  icon?: string; // lucide icon name or image URL
  url: string; // iframe target URL or relative path
  permissions: LoomCapability[];
  author?: string;
  themeColor?: string;
}

export interface InstalledApp extends AppManifest {
  installedAt: number;
  isBuiltin?: boolean;
  trusted?: boolean;
}

