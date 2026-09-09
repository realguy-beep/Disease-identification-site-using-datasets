import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db, initializeDatabase } from './services/db';
import { rpcBroker } from './services/rpcBroker';
import { generateSessionToken } from './services/security';
import { exportLoomBackup } from './services/backup';
import { hashPassphrase, wipeGuestProfile } from './services/auth';

import type { StateItem } from './types/state';
import type { InstalledApp, AppManifest } from './types/manifest';
import type { ZoneDefinition } from './types/zone';
import type { CardInstance } from './types/card';
import type { VFSNode } from './types/vfs';
import type { LoomNotification } from './types/notification';
import type { UserProfile } from './types/auth';
import type { LoomSettings } from './types/settings';

import { TopBar } from './components/TopBar';
import { AdaptiveCanvas } from './components/AdaptiveCanvas';
import { CommandPalette } from './components/CommandPalette';
import { AppLauncherModal } from './components/AppLauncherModal';
import { UniversalStateDrawer } from './components/UniversalStateDrawer';
import { ZoneManagerModal } from './components/ZoneManagerModal';
import { Dock } from './components/Dock';
import { AltTabSwitcher } from './components/AltTabSwitcher';
import { AppStoreModal } from './components/AppStoreModal';
import { NotificationCenter } from './components/NotificationCenter';
import { LockScreen } from './components/LockScreen';
import { BootScreen } from './components/BootScreen';
import { ClipboardManagerModal } from './components/ClipboardManagerModal';
import { FilePickerDialog } from './components/FilePickerDialog';

interface NotificationToast {
  id: string;
  title: string;
  message: string;
  appId: string;
}

interface ClipboardItem {
  id: string;
  text: string;
  timestamp: number;
}

export const App: React.FC = () => {
  // Boot & Auth
  const [isBooting, setIsBooting] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);

  // Core OS Data
  const [isReady, setIsReady] = useState(false);
  const [zones, setZones] = useState<ZoneDefinition[]>([]);
  const [currentZone, setCurrentZone] = useState<ZoneDefinition | undefined>(undefined);
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [cards, setCards] = useState<CardInstance[]>([]);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [stateItems, setStateItems] = useState<StateItem[]>([]);
  const [vfsFiles, setVfsFiles] = useState<VFSNode[]>([]);
  const [settings, setSettings] = useState<LoomSettings | null>(null);

  // Modals & Subsystems
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAppLauncherOpen, setIsAppLauncherOpen] = useState(false);
  const [isAppStoreOpen, setIsAppStoreOpen] = useState(false);
  const [isStateDrawerOpen, setIsStateDrawerOpen] = useState(false);
  const [isZoneManagerOpen, setIsZoneManagerOpen] = useState(false);
  const [isNotifCenterOpen, setIsNotifCenterOpen] = useState(false);
  const [isClipboardOpen, setIsClipboardOpen] = useState(false);
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);
  const [selectedStateItem, setSelectedStateItem] = useState<StateItem | null>(null);

  // Alt+Tab Process Switcher
  const [isAltTabOpen, setIsAltTabOpen] = useState(false);
  const [altTabSelectedIndex, setAltTabSelectedIndex] = useState(0);

  // Notifications & Clipboard
  const [toastNotifs, setToastNotifs] = useState<NotificationToast[]>([]);
  const [persistentNotifs, setPersistentNotifs] = useState<LoomNotification[]>([]);
  const [dnd, setDnd] = useState(false);
  const [clipboardHistory, setClipboardHistory] = useState<ClipboardItem[]>([
    { id: 'clip-1', text: 'https://github.com/google/antigravity', timestamp: Date.now() - 400000 },
    { id: 'clip-2', text: 'sandbox="allow-scripts allow-forms"', timestamp: Date.now() - 800000 }
  ]);

  const highestZIndexRef = useRef(10);

  // 1. Initial boot: DB initialization & RPC broker start
  useEffect(() => {
    let mounted = true;

    async function boot() {
      await initializeDatabase();
      rpcBroker.startListening();

      // Universal state changes listener
      const unbindState = rpcBroker.onStateChange(async () => {
        const freshItems = await db.stateItems.reverse().sortBy('updatedAt');
        const freshFiles = await db.vfsNodes.toArray();
        if (mounted) {
          setStateItems(freshItems);
          setVfsFiles(freshFiles);
        }
      });

      // App notification listener
      const unbindNotif = rpcBroker.onNotification(async (notif) => {
        const toastId = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        if (mounted) {
          setToastNotifs(prev => [{ id: toastId, ...notif }, ...prev.slice(0, 4)]);
          const allNotifs = await db.notifications.reverse().sortBy('timestamp');
          setPersistentNotifs(allNotifs);
        }
        setTimeout(() => {
          if (mounted) setToastNotifs(prev => prev.filter(n => n.id !== toastId));
        }, 6000);
      });

      // Load DB records
      const loadedZones = await db.zones.toArray();
      const loadedApps = await db.installedApps.toArray();
      const loadedState = await db.stateItems.reverse().sortBy('updatedAt');
      const loadedFiles = await db.vfsNodes.toArray();
      const loadedProfiles = await db.profiles.toArray();
      const loadedNotifs = await db.notifications.reverse().sortBy('timestamp');
      const loadedSettings = await db.settings.get('current_settings');

      if (!mounted) return;
      setZones(loadedZones);
      setApps(loadedApps);
      setStateItems(loadedState);
      setVfsFiles(loadedFiles);
      setProfiles(loadedProfiles);
      setPersistentNotifs(loadedNotifs);
      if (loadedSettings) {
        setSettings(loadedSettings);
        setDnd(loadedSettings.dnd || false);
      }

      // Set active profile
      const primaryUser = loadedProfiles[0] || null;
      setActiveProfile(primaryUser);
      if (primaryUser?.passwordHash) {
        setIsLocked(true);
      }

      // Initial zone based on time of day
      const now = new Date();
      const currentHours = now.getHours();
      let initialZone = loadedZones.find(z => {
        const [startH] = z.timeStart.split(':').map(Number);
        const [endH] = z.timeEnd.split(':').map(Number);
        if (startH < endH) {
          return currentHours >= startH && currentHours < endH;
        } else {
          return currentHours >= startH || currentHours < endH;
        }
      }) || loadedZones[0];

      setCurrentZone(initialZone);
      setIsReady(true);

      return () => {
        unbindState();
        unbindNotif();
      };
    }

    boot();

    return () => {
      mounted = false;
      rpcBroker.stopListening();
    };
  }, []);

  // 2. Load zone cards when zone changes
  useEffect(() => {
    if (!currentZone) return;

    async function syncZoneCards() {
      if (!currentZone) return;
      const zoneCards = await db.cards.where('zoneId').equals(currentZone.id).toArray();

      if (zoneCards.length > 0) {
        zoneCards.forEach(card => {
          rpcBroker.registerSession(card.id, card.appId, card.sessionToken);
        });
        setCards(zoneCards);
        setActiveCardId(zoneCards[zoneCards.length - 1]?.id || null);
      } else {
        const defaultApps = currentZone.defaultAppIds || [];
        const newCards: CardInstance[] = [];

        for (let i = 0; i < defaultApps.length; i++) {
          const appId = defaultApps[i];
          const app = await db.installedApps.get(appId);
          if (!app) continue;

          const token = generateSessionToken();
          const cardId = `card-${currentZone.id}-${appId}-${Date.now()}`;
          const card: CardInstance = {
            id: cardId,
            appId,
            title: app.name,
            x: 40 + i * 440,
            y: 70,
            width: 420,
            height: 480,
            zIndex: i + 1,
            isMinimized: false,
            isMaximized: false,
            sessionToken: token,
            zoneId: currentZone.id
          };

          rpcBroker.registerSession(cardId, appId, token);
          newCards.push(card);
        }

        if (newCards.length > 0) {
          await db.cards.bulkAdd(newCards);
        }
        setCards(newCards);
        setActiveCardId(newCards[newCards.length - 1]?.id || null);
      }
    }

    syncZoneCards();
  }, [currentZone]);

  // 3. Global keyboard shortcuts: Cmd+K, Alt+Tab, Cmd+Shift+V, Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K: Spotlight Search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      // Cmd+Shift+V: Clipboard Manager
      else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setIsClipboardOpen(prev => !prev);
      }
      // Alt+Tab: App Switcher
      else if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        if (cards.length > 0) {
          setIsAltTabOpen(true);
          setAltTabSelectedIndex(prev => (prev + 1) % cards.length);
        }
      }
      // Escape: Close all modals
      else if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsAppLauncherOpen(false);
        setIsAppStoreOpen(false);
        setIsStateDrawerOpen(false);
        setIsZoneManagerOpen(false);
        setIsNotifCenterOpen(false);
        setIsClipboardOpen(false);
        setIsFilePickerOpen(false);
        setIsAltTabOpen(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt' && isAltTabOpen) {
        // Release Alt to switch
        const targetCard = cards[altTabSelectedIndex];
        if (targetCard) {
          handleFocusCard(targetCard.id);
          if (targetCard.isMinimized) {
            handleUpdateCard(targetCard.id, { isMinimized: false });
          }
        }
        setIsAltTabOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [cards, altTabSelectedIndex, isAltTabOpen]);

  // 4. Host postMessage Command Handler (for Terminal, Task Manager, Settings)
  useEffect(() => {
    const handleHostMessages = async (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'LOOM_FORCE_KILL_APP' && data.appId) {
        const cardToKill = cards.find(c => c.appId === data.appId);
        if (cardToKill) {
          handleCloseCard(cardToKill.id);
        }
      } else if (data.type === 'LOOM_OPEN_APP' && data.appId) {
        const targetApp = apps.find(a => a.id === data.appId);
        if (targetApp) {
          handleLaunchApp(targetApp);
        }
      } else if (data.type === 'LOOM_SET_PASSPHRASE' && data.passphrase) {
        if (activeProfile) {
          const hash = await hashPassphrase(data.passphrase);
          await db.profiles.update(activeProfile.id, { passwordHash: hash });
          const updated = await db.profiles.get(activeProfile.id);
          if (updated) setActiveProfile(updated);
        }
      } else if (data.type === 'LOOM_SETTINGS_UPDATE' && data.settings) {
        await db.settings.put({ id: 'current_settings', ...data.settings, updatedAt: Date.now() });
        setSettings(data.settings);
        if (data.settings.fontSize) {
          document.documentElement.setAttribute('data-scale', data.settings.fontSize);
        }
      } else if (data.type === 'LOOM_GET_SETTINGS') {
        const current = settings || await db.settings.get('current_settings');
        if (current && event.source) {
          (event.source as Window).postMessage({ type: 'LOOM_SETTINGS_CURRENT', settings: current }, '*');
        }
      }
    };

    window.addEventListener('message', handleHostMessages);
    return () => window.removeEventListener('message', handleHostMessages);
  }, [cards, apps, activeProfile, settings]);

  // Synchronize CSS custom properties and document attributes with personal settings
  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    root.style.setProperty('--loom-accent', settings.accentColor || '#6366f1');
    root.style.setProperty('--loom-window-radius', `${settings.windowCornerRadius ?? 16}px`);
    root.style.setProperty('--loom-window-blur', `${settings.windowBlur ?? 16}px`);
    root.style.setProperty('--loom-window-opacity', `${settings.windowOpacity ?? 0.94}`);
    root.style.setProperty('--loom-anim-speed', `${settings.animSpeed ?? 200}ms`);

    let fontVal = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    if (settings.fontFamily === 'inter') fontVal = '"Inter", system-ui, sans-serif';
    else if (settings.fontFamily === 'mono') fontVal = '"JetBrains Mono", "Fira Code", monospace';
    else if (settings.fontFamily === 'serif') fontVal = 'Georgia, Cambria, serif';
    root.style.setProperty('--loom-font', fontVal);

    root.setAttribute('data-font', settings.fontFamily || 'system');
    root.setAttribute('data-scale', settings.fontSize || 'md');
    root.setAttribute('data-theme', settings.themeMode || 'dark');
  }, [settings]);

  // Card Window Management
  const handleUpdateCard = useCallback(async (cardId: string, updates: Partial<CardInstance>) => {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, ...updates } : c));
    await db.cards.update(cardId, updates);
  }, []);

  const handleCloseCard = useCallback(async (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (card) {
      rpcBroker.unregisterSession(card.sessionToken);
    }
    setCards(prev => prev.filter(c => c.id !== cardId));
    await db.cards.delete(cardId);
    if (activeCardId === cardId) {
      setActiveCardId(cards.find(c => c.id !== cardId)?.id || null);
    }
  }, [cards, activeCardId]);

  const handleFocusCard = useCallback(async (cardId: string) => {
    highestZIndexRef.current += 1;
    const newZ = highestZIndexRef.current;
    setActiveCardId(cardId);
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, zIndex: newZ } : c));
    await db.cards.update(cardId, { zIndex: newZ });
  }, []);

  const handleToggleMinimize = useCallback(async (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    const isMin = !card.isMinimized;
    await handleUpdateCard(cardId, { isMinimized: isMin });
    if (!isMin) {
      handleFocusCard(cardId);
    }
  }, [cards, handleUpdateCard, handleFocusCard]);

  // Launch app as card window
  const handleLaunchApp = useCallback(async (app: InstalledApp) => {
    if (!currentZone) return;

    // If card is already open and minimized, restore and focus it
    const existing = cards.find(c => c.appId === app.id);
    if (existing) {
      if (existing.isMinimized) {
        await handleUpdateCard(existing.id, { isMinimized: false });
      }
      handleFocusCard(existing.id);
      return;
    }

    highestZIndexRef.current += 1;
    const token = generateSessionToken();
    const cardId = `card-${currentZone.id}-${app.id}-${Date.now()}`;
    
    const offset = (cards.length % 5) * 28;
    const newCard: CardInstance = {
      id: cardId,
      appId: app.id,
      title: app.name,
      x: 80 + offset,
      y: 70 + offset,
      width: 440,
      height: 490,
      zIndex: highestZIndexRef.current,
      isMinimized: false,
      isMaximized: false,
      sessionToken: token,
      zoneId: currentZone.id
    };

    rpcBroker.registerSession(cardId, app.id, token);
    await db.cards.add(newCard);
    setCards(prev => [...prev, newCard]);
    setActiveCardId(cardId);
  }, [currentZone, cards, handleUpdateCard, handleFocusCard]);

  // Install app
  const handleInstallApp = async (manifest: AppManifest) => {
    const newApp: InstalledApp = {
      ...manifest,
      installedAt: Date.now(),
      isBuiltin: false,
      trusted: false
    };
    await db.installedApps.put(newApp);
    const updatedApps = await db.installedApps.toArray();
    setApps(updatedApps);
  };

  // Uninstall app
  const handleUninstallApp = async (appId: string) => {
    await db.installedApps.delete(appId);
    const appCards = await db.cards.where('appId').equals(appId).toArray();
    for (const card of appCards) {
      rpcBroker.unregisterSession(card.sessionToken);
      await db.cards.delete(card.id);
    }
    setCards(prev => prev.filter(c => c.appId !== appId));
    const updatedApps = await db.installedApps.toArray();
    setApps(updatedApps);
  };

  // Toggle DND
  const handleToggleDnd = async () => {
    const next = !dnd;
    setDnd(next);
    await db.settings.update('current_settings', { dnd: next });
  };

  // Lock / Logout
  const handleLock = () => {
    setIsLocked(true);
  };

  const handleLogout = async () => {
    if (activeProfile?.isGuest) {
      await wipeGuestProfile(activeProfile.id);
    }
    // Minimize / close active cards
    cards.forEach(c => rpcBroker.unregisterSession(c.sessionToken));
    await db.cards.clear();
    setCards([]);
    setIsLocked(true);
  };

  // Clipboard operations
  const handleCopyClipboardItem = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {}
  };

  const handleDeleteClipboardItem = (id: string) => {
    setClipboardHistory(prev => prev.filter(c => c.id !== id));
  };

  const handleAddClipboardItem = (text: string) => {
    setClipboardHistory(prev => [
      { id: `clip-${Date.now()}`, text, timestamp: Date.now() },
      ...prev.slice(0, 24)
    ]);
  };

  if (!isReady || isBooting) {
    return <BootScreen onComplete={() => setIsBooting(false)} />;
  }

  if (isLocked) {
    return (
      <LockScreen
        isLocked={isLocked}
        profiles={profiles}
        activeProfile={activeProfile}
        onUnlock={(user) => {
          setActiveProfile(user);
          setIsLocked(false);
        }}
      />
    );
  }

  return (
    <div 
      className="h-screen w-screen flex flex-col overflow-hidden bg-[#090a0f] text-zinc-100 font-sans relative"
      style={{ accentColor: settings?.accentColor || '#6366f1' }}
    >
      {/* Top Ambient Bar & System Tray */}
      <TopBar
        currentZone={currentZone}
        zones={zones}
        onSelectZone={setCurrentZone}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenAppLauncher={() => setIsAppLauncherOpen(true)}
        onOpenStateDrawer={() => setIsStateDrawerOpen(true)}
        onOpenZoneManager={() => setIsZoneManagerOpen(true)}
        onOpenNotifications={() => setIsNotifCenterOpen(true)}
        onLock={handleLock}
        onLogout={handleLogout}
        cards={cards}
        onRestoreCard={(id) => {
          handleUpdateCard(id, { isMinimized: false });
          handleFocusCard(id);
        }}
        stateCount={stateItems.length}
        unreadNotifCount={persistentNotifs.filter(n => !n.read).length}
        dnd={dnd}
        onToggleDnd={handleToggleDnd}
      />

      {/* Adaptive Surface Canvas */}
      <AdaptiveCanvas
        currentZone={currentZone}
        cards={cards}
        apps={apps}
        activeCardId={activeCardId}
        settings={settings}
        onUpdateCard={handleUpdateCard}
        onCloseCard={handleCloseCard}
        onFocusCard={handleFocusCard}
        onOpenAppLauncher={() => setIsAppStoreOpen(true)}
        notifications={dnd ? [] : toastNotifs}
        onDismissNotification={(id) => setToastNotifs(prev => prev.filter(n => n.id !== id))}
      />

      {/* Adaptive Process Dock */}
      <Dock
        cards={cards}
        apps={apps}
        activeCardId={activeCardId}
        position={settings?.dockPosition || 'bottom'}
        size={settings?.dockSize || 'md'}
        autoHide={settings?.dockAutoHide || false}
        accentColor={settings?.accentColor || '#6366f1'}
        onFocusCard={handleFocusCard}
        onToggleMinimize={handleToggleMinimize}
        onCloseCard={handleCloseCard}
        onLaunchApp={handleLaunchApp}
        onOpenAppStore={() => setIsAppStoreOpen(true)}
        onOpenSettings={() => {
          const settingsApp = apps.find(a => a.id === 'loom.settings');
          if (settingsApp) handleLaunchApp(settingsApp);
        }}
      />

      {/* Alt-Tab Process Switcher */}
      <AltTabSwitcher
        isOpen={isAltTabOpen}
        cards={cards}
        apps={apps}
        selectedIndex={altTabSelectedIndex}
        onSelectIndex={setAltTabSelectedIndex}
        onConfirm={(cardId) => {
          handleFocusCard(cardId);
          handleUpdateCard(cardId, { isMinimized: false });
          setIsAltTabOpen(false);
        }}
        onClose={() => setIsAltTabOpen(false)}
      />

      {/* Spotlight Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        stateItems={stateItems}
        apps={apps}
        files={vfsFiles}
        zones={zones}
        onSelectStateItem={(item) => {
          setSelectedStateItem(item);
          setIsStateDrawerOpen(true);
        }}
        onSelectFile={() => {
          const filesApp = apps.find(a => a.id === 'loom.files');
          if (filesApp) handleLaunchApp(filesApp);
        }}
        onLaunchApp={handleLaunchApp}
        onSelectZone={setCurrentZone}
        onCreateStateItem={(type) => {
          setSelectedStateItem({
            id: '',
            type,
            title: '',
            content: '',
            tags: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          setIsStateDrawerOpen(true);
        }}
        onOpenAppLauncher={() => setIsAppStoreOpen(true)}
        onOpenSettings={() => {
          const s = apps.find(a => a.id === 'loom.settings');
          if (s) handleLaunchApp(s);
        }}
        onExportState={exportLoomBackup}
      />

      {/* Curated App Store */}
      <AppStoreModal
        isOpen={isAppStoreOpen}
        onClose={() => setIsAppStoreOpen(false)}
        installedApps={apps}
        onInstallApp={handleInstallApp}
        onLaunchApp={handleLaunchApp}
      />

      {/* App Registry & Raw Manifest Installer */}
      <AppLauncherModal
        isOpen={isAppLauncherOpen}
        onClose={() => setIsAppLauncherOpen(false)}
        apps={apps}
        onLaunchApp={handleLaunchApp}
        onInstallApp={handleInstallApp}
        onUninstallApp={handleUninstallApp}
      />

      {/* Notification Center Flyout */}
      <NotificationCenter
        isOpen={isNotifCenterOpen}
        onClose={() => setIsNotifCenterOpen(false)}
        notifications={persistentNotifs}
        dnd={dnd}
        onToggleDnd={handleToggleDnd}
        onClearAll={async () => {
          await db.notifications.clear();
          setPersistentNotifs([]);
        }}
        onDismiss={async (id) => {
          await db.notifications.delete(id);
          setPersistentNotifs(prev => prev.filter(n => n.id !== id));
        }}
        apps={apps}
      />

      {/* System Clipboard History (Cmd+Shift+V) */}
      <ClipboardManagerModal
        isOpen={isClipboardOpen}
        onClose={() => setIsClipboardOpen(false)}
        history={clipboardHistory}
        onCopyItem={handleCopyClipboardItem}
        onDeleteItem={handleDeleteClipboardItem}
        onAddItem={handleAddClipboardItem}
      />

      {/* File Picker Dialog for Apps */}
      <FilePickerDialog
        isOpen={isFilePickerOpen}
        onClose={() => setIsFilePickerOpen(false)}
        onSelectFile={() => setIsFilePickerOpen(false)}
      />

      {/* Universal State Store Drawer */}
      <UniversalStateDrawer
        isOpen={isStateDrawerOpen}
        onClose={() => {
          setIsStateDrawerOpen(false);
          setSelectedStateItem(null);
        }}
        stateItems={stateItems}
        selectedItem={selectedStateItem}
        onSelectItem={setSelectedStateItem}
        onSaveItem={async (itemData) => {
          if (itemData.id) {
            await db.stateItems.update(itemData.id, { ...itemData, updatedAt: Date.now() });
          } else {
            await db.stateItems.add({
              id: `state-${Date.now()}`,
              type: itemData.type || 'note',
              title: itemData.title || 'Untitled',
              content: itemData.content || '',
              tags: itemData.tags || [],
              links: itemData.links || [],
              createdAt: Date.now(),
              updatedAt: Date.now()
            });
          }
          const fresh = await db.stateItems.reverse().sortBy('updatedAt');
          setStateItems(fresh);
        }}
        onDeleteItem={async (id) => {
          await db.stateItems.delete(id);
          const fresh = await db.stateItems.reverse().sortBy('updatedAt');
          setStateItems(fresh);
        }}
        onExportBackup={exportLoomBackup}
        onImportBackup={async (items) => {
          await db.stateItems.bulkPut(items);
          const fresh = await db.stateItems.reverse().sortBy('updatedAt');
          setStateItems(fresh);
        }}
      />

      {/* Zone Manager Modal */}
      <ZoneManagerModal
        isOpen={isZoneManagerOpen}
        onClose={() => setIsZoneManagerOpen(false)}
        zones={zones}
        apps={apps}
        onSaveZone={async (newZone) => {
          await db.zones.put(newZone);
          const fresh = await db.zones.toArray();
          setZones(fresh);
          setCurrentZone(newZone);
        }}
        onDeleteZone={async (zoneId) => {
          await db.zones.delete(zoneId);
          await db.cards.where('zoneId').equals(zoneId).delete();
          const fresh = await db.zones.toArray();
          setZones(fresh);
          if (currentZone?.id === zoneId) setCurrentZone(fresh[0]);
        }}
      />
    </div>
  );
};

export default App;
