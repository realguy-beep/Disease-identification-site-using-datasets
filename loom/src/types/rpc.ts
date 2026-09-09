export interface LoomRPCRequest {
  jsonrpc: '2.0';
  id: string; // unique request identifier
  token: string; // instance session token
  appId: string;
  method: 
    | 'loom:handshake'
    | 'loom:getAppInfo'
    | 'storage:get'
    | 'storage:set'
    | 'storage:delete'
    | 'clipboard:read'
    | 'clipboard:write'
    | 'state:query'
    | 'state:create'
    | 'state:update'
    | 'state:delete'
    | 'vfs:list'
    | 'vfs:createFile'
    | 'vfs:createFolder'
    | 'vfs:updateFile'
    | 'vfs:trash'
    | 'vfs:restore'
    | 'vfs:quota'
    | 'notification:show';
  params?: any;
}

export interface LoomRPCResponse {
  jsonrpc: '2.0';
  id: string;
  success: boolean;
  result?: any;
  error?: {
    code: number;
    message: string;
    details?: any;
  };
}

export interface ScopedStorageRecord {
  id?: number;
  appId: string;
  key: string;
  value: any;
  updatedAt: number;
}
