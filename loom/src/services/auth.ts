import { db } from './db';
import type { UserProfile } from '../types/auth';

export async function hashPassphrase(passphrase: string): Promise<string> {
  if (!passphrase) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(passphrase);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassphrase(passphrase: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return true; // No password set
  const hash = await hashPassphrase(passphrase);
  return hash === storedHash;
}

export async function getAllProfiles(): Promise<UserProfile[]> {
  return await db.profiles.toArray();
}

export async function createProfile(username: string, displayName: string, passphrase?: string): Promise<UserProfile> {
  const hash = passphrase ? await hashPassphrase(passphrase) : '';
  const profile: UserProfile = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    username: username.toLowerCase().trim(),
    displayName: displayName.trim(),
    passwordHash: hash,
    isGuest: false,
    createdAt: Date.now()
  };
  await db.profiles.add(profile);
  return profile;
}

export async function createGuestProfile(): Promise<UserProfile> {
  const guest: UserProfile = {
    id: `user-guest-${Date.now()}`,
    username: 'guest',
    displayName: 'Guest Operator',
    passwordHash: '',
    isGuest: true,
    createdAt: Date.now()
  };
  await db.profiles.add(guest);
  return guest;
}

export async function wipeGuestProfile(profileId: string): Promise<void> {
  await db.profiles.delete(profileId);
  // Wipe all files created by this guest
  const guestNodes = await db.vfsNodes.where('userId').equals(profileId).toArray();
  await db.vfsNodes.bulkDelete(guestNodes.map(n => n.id));
}

