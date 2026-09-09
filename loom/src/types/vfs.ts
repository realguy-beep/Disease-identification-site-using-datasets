export type VFSNodeType = 'file' | 'folder';

export interface VFSNode {
  id: string;
  parentId: string | null; // null for root level
  name: string;
  type: VFSNodeType;
  content?: string; // UTF-8 text or Base64 data URI
  size: number; // in bytes
  mimeType?: string;
  isTrash: boolean;
  createdAt: number;
  updatedAt: number;
  userId?: string;
}

export interface VFSQuota {
  usedBytes: number;
  maxBytes: number;
  fileCount: number;
  folderCount: number;
}

