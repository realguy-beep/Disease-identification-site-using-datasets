import React, { useState, useEffect } from 'react';
import type { ZoneDefinition } from '../types/zone';
import type { CardInstance } from '../types/card';
import { 
  Sun, 
  Zap, 
  Moon, 
  Search, 
  Database, 
  ChevronDown,
  LayoutGrid,
  Bell,
  BellOff,
  Battery,
  BatteryCharging,
  Wifi,
  WifiOff,
  Volume2,
  Lock,
  LogOut
} from 'lucide-react';

interface TopBarProps {
  currentZone: ZoneDefinition | undefined;
  zones: ZoneDefinition[];
  onSelectZone: (zone: ZoneDefinition) => void;
  onOpenCommandPalette: () => void;
  onOpenAppLauncher: () => void;
  onOpenStateDrawer: () => void;
  onOpenZoneManager: () => void;
  onOpenNotifications: () => void;
  onOpenQuickSettings?: () => void;
  onLock: () => void;
  onLogout: () => void;
  cards: CardInstance[];
  onRestoreCard: (cardId: string) => void;
  stateCount: number;
  unreadNotifCount: number;
  dnd: boolean;
  onToggleDnd: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentZone,
  zones,
  onSelectZone,
  onOpenCommandPalette,
  onOpenAppLauncher,
  onOpenStateDrawer,
  onOpenZoneManager,
  onOpenNotifications,
  onLock,
  onLogout,
  cards,
  onRestoreCard,
  stateCount,
  unreadNotifCount,
  dnd,
  onToggleDnd
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [isZoneDropdownOpen, setIsZoneDropdownOpen] = useState(false);
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const [volume, setVolume] = useState(80);
  const [brightness, setBrightness] = useState(100);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDateStr(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    // Online/offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Battery status API
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBattery = () => {
          setBatteryLevel(Math.round(battery.level * 100));
          setIsCharging(battery.charging);
        };
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
      }).catch(() => {});
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const renderZoneIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sun': return <Sun className="w-3.5 h-3.5 text-amber-400" />;
      case 'Moon': return <Moon className="w-3.5 h-3.5 text-purple-400" />;
      default: return <Zap className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  const minimizedCards = cards.filter(c => c.isMinimized);

  return (
    <header className="h-12 w-full bg-[#08090e]/90 backdrop-blur-md border-b border-white/[0.07] px-4 flex items-center justify-between z-40 select-none">
      {/* Left: Brand + Adaptive Zone Pill */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-2 border-r border-white/10">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-[11px] font-bold text-white tracking-tighter">L</span>
          </div>
          <span className="text-sm font-semibold tracking-wider text-zinc-100 hidden sm:inline">
            Loom
          </span>
        </div>

        {/* Zone Selector Pill */}
        <div className="relative">
          <button
            onClick={() => setIsZoneDropdownOpen(!isZoneDropdownOpen)}
            className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 transition-colors text-xs text-zinc-200"
          >
            {currentZone && renderZoneIcon(currentZone.icon)}
            <span className="font-medium">{currentZone?.name || 'Context Zone'}</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {/* Zone Dropdown */}
          {isZoneDropdownOpen && (
            <div 
              onMouseLeave={() => setIsZoneDropdownOpen(false)}
              className="absolute left-0 mt-2 w-64 rounded-xl bg-[#12141e] border border-white/15 shadow-2xl p-1.5 z-50 flex flex-col gap-1 backdrop-blur-xl"
            >
              <div className="text-[10px] uppercase font-semibold text-zinc-500 px-2 py-1 tracking-wider">
                Context Zones
              </div>
              {zones.map(z => {
                const isCurrent = z.id === currentZone?.id;
                return (
                  <button
                    key={z.id}
                    onClick={() => {
                      onSelectZone(z);
                      setIsZoneDropdownOpen(false);
                    }}
                    className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                      isCurrent ? 'bg-indigo-500/15 border border-indigo-500/30' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="mt-0.5">{renderZoneIcon(z.icon)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${isCurrent ? 'text-indigo-300' : 'text-zinc-200'}`}>
                          {z.name}
                        </span>
                        <span className="text-[10px] text-zinc-500">{z.timeStart} - {z.timeEnd}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{z.description}</p>
                    </div>
                  </button>
                );
              })}
              <div className="border-t border-white/5 mt-1 pt-1">
                <button
                  onClick={() => {
                    setIsZoneDropdownOpen(false);
                    onOpenZoneManager();
                  }}
                  className="w-full text-center py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 rounded-md transition-colors"
                >
                  Configure Zones & Triggers
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Minimized Tray */}
        {minimizedCards.length > 0 && (
          <div className="hidden md:flex items-center gap-1.5 pl-2 border-l border-white/10">
            {minimizedCards.map(c => {
              return (
                <button
                  key={c.id}
                  onClick={() => onRestoreCard(c.id)}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.1] border border-white/5 text-zinc-300 text-xs transition-colors"
                  title={`Restore ${c.title}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                  <span className="max-w-[100px] truncate">{c.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Center: Persistent Global Search Bar */}
      <div 
        onClick={onOpenCommandPalette}
        className="relative flex items-center cursor-pointer group"
      >
        <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 group-hover:text-indigo-400 transition-colors pointer-events-none" />
        <input
          type="text"
          placeholder="Search apps, files, 5+5, timer 10m... (⌘K)"
          readOnly
          className="pl-8 pr-12 py-1.5 rounded-full bg-white/[0.05] group-hover:bg-white/[0.08] border border-white/10 group-hover:border-white/20 text-xs text-zinc-200 placeholder-zinc-500 w-48 sm:w-72 md:w-84 cursor-pointer transition-all outline-none select-none"
        />
        <kbd className="absolute right-2.5 px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-zinc-400 group-hover:text-zinc-200 pointer-events-none">
          ⌘K
        </kbd>
      </div>

      {/* Right: System Tray & Quick Settings */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenAppLauncher}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-medium text-indigo-300 transition-colors"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Apps</span>
        </button>

        <button
          onClick={onOpenStateDrawer}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-zinc-300 transition-colors"
          title="Universal State Store"
        >
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">State</span>
          <span className="text-[10px] px-1 rounded-full bg-white/10 text-zinc-400">
            {stateCount}
          </span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Notification Center"
        >
          {dnd ? <BellOff className="w-3.5 h-3.5 text-amber-400" /> : <Bell className="w-3.5 h-3.5" />}
          {unreadNotifCount > 0 && (
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-[#08090e]" />
          )}
        </button>

        {/* System Tray Icons */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-white/10 text-zinc-400">
          {/* Network Indicator */}
          <span title={isOnline ? 'Online (IndexedDB synced)' : 'Offline (Local-first mode)'}>
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            )}
          </span>

          {/* Battery Indicator */}
          {batteryLevel !== null && (
            <div className="flex items-center gap-0.5 text-[10px] font-mono text-zinc-400" title={`Battery: ${batteryLevel}%`}>
              {isCharging ? (
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Battery className="w-3.5 h-3.5" />
              )}
              <span className="hidden lg:inline">{batteryLevel}%</span>
            </div>
          )}

          {/* Volume Stub */}
          <div className="relative">
            <button
              onClick={() => setIsVolumeOpen(!isVolumeOpen)}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              title="Volume"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
            {isVolumeOpen && (
              <div 
                className="absolute right-0 mt-2 p-3 bg-[#12141f] border border-white/15 rounded-xl shadow-2xl z-50 flex items-center gap-2"
                onMouseLeave={() => setIsVolumeOpen(false)}
              >
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={e => setVolume(Number(e.target.value))}
                  className="w-24 accent-indigo-500"
                />
                <span className="text-[10px] font-mono text-zinc-400">{volume}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Settings & Clock */}
        <div className="relative">
          <button
            onClick={() => setIsQuickSettingsOpen(!isQuickSettingsOpen)}
            className="flex flex-col text-right pl-2 hover:bg-white/5 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <span className="text-xs font-medium text-zinc-200 leading-tight">{timeStr}</span>
            <span className="text-[10px] text-zinc-500 leading-tight">{dateStr}</span>
          </button>

          {/* Quick Settings Dropdown */}
          {isQuickSettingsOpen && (
            <div 
              onMouseLeave={() => setIsQuickSettingsOpen(false)}
              className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#12141f]/95 border border-white/15 shadow-2xl p-3 z-50 flex flex-col gap-3 backdrop-blur-2xl text-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10 font-semibold text-zinc-200">
                <span>Quick Settings</span>
                <span className="text-[10px] text-zinc-500 font-mono">Loom OS</span>
              </div>

              {/* Sliders */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span>Display Brightness</span>
                  <span>{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={brightness}
                  onChange={e => setBrightness(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Toggles */}
              <div className="flex flex-col gap-1 pt-1 border-t border-white/5">
                <button
                  onClick={onToggleDnd}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 transition-colors text-zinc-300"
                >
                  <div className="flex items-center gap-2">
                    <BellOff className="w-3.5 h-3.5 text-amber-400" />
                    <span>Do Not Disturb</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${dnd ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-zinc-500'}`}>
                    {dnd ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setIsQuickSettingsOpen(false);
                    onLock();
                  }}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors text-zinc-300"
                >
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Lock Loom Screen</span>
                </button>

                <button
                  onClick={() => {
                    setIsQuickSettingsOpen(false);
                    onLogout();
                  }}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors text-red-400"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
