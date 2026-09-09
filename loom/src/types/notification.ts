export interface LoomNotification {
  id: string;
  title: string;
  message: string;
  appId: string;
  timestamp: number;
  read: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
}

