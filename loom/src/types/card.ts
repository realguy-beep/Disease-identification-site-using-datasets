export interface CardInstance {
  id: string;
  appId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  sessionToken: string; // cryptographically random token for sandboxed postMessage RPC
  zoneId?: string;
  lastActiveAt?: number;
}

