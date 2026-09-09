import { db } from './db';

export interface LoomBackupEnvelope {
  format: 'LOOM_OS_BACKUP';
  version: '2.0.0';
  exportedAt: string;
  data: {
    stateItems: any[];
    installedApps: any[];
    zones: any[];
    vfsNodes: any[];
    profiles: any[];
    settings: any[];
  };
}

export async function exportLoomBackup(): Promise<void> {
  const backup: LoomBackupEnvelope = {
    format: 'LOOM_OS_BACKUP',
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    data: {
      stateItems: await db.stateItems.toArray(),
      installedApps: await db.installedApps.toArray(),
      zones: await db.zones.toArray(),
      vfsNodes: await db.vfsNodes.toArray(),
      profiles: await db.profiles.toArray(),
      settings: await db.settings.toArray()
    }
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `loom-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importLoomBackup(rawJson: string): Promise<{ success: boolean; message: string }> {
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || parsed.format !== 'LOOM_OS_BACKUP' || !parsed.data) {
      throw new Error('Invalid backup file format: Missing LOOM_OS_BACKUP signature');
    }

    const { stateItems, installedApps, zones, vfsNodes, profiles, settings } = parsed.data;

    if (Array.isArray(stateItems)) await db.stateItems.bulkPut(stateItems);
    if (Array.isArray(installedApps)) await db.installedApps.bulkPut(installedApps);
    if (Array.isArray(zones)) await db.zones.bulkPut(zones);
    if (Array.isArray(vfsNodes)) await db.vfsNodes.bulkPut(vfsNodes);
    if (Array.isArray(profiles)) await db.profiles.bulkPut(profiles);
    if (Array.isArray(settings)) await db.settings.bulkPut(settings);

    return { success: true, message: 'Backup restored successfully! Refreshing Loom...' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to import backup' };
  }
}

