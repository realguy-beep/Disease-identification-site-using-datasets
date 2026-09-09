export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  passwordHash?: string; // SHA-256 hash or empty for no passphrase
  isGuest: boolean;
  createdAt: number;
}

