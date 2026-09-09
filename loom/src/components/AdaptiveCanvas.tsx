import React from 'react';
import type { CardInstance } from '../types/card';
import type { InstalledApp } from '../types/manifest';
import type { ZoneDefinition } from '../types/zone';
import type { LoomSettings } from '../types/settings';
import { CardWindow } from './CardWindow';
import { Bell, Layers } from 'lucide-react';

interface NotificationToast {
  id: string;
  title: string;
  message: string;
  appId: string;
}

interface AdaptiveCanvasProps {
  currentZone: ZoneDefinition | undefined;
  cards: CardInstance[];
  apps: InstalledApp[];
  activeCardId: string | null;
  settings?: LoomSettings | null;
  onUpdateCard: (cardId: string, updates: Partial<CardInstance>) => void;
  onCloseCard: (cardId: string) => void;
  onFocusCard: (cardId: string) => void;
  onOpenAppLauncher: () => void;
  notifications: NotificationToast[];
  onDismissNotification: (id: string) => void;
}

export const AdaptiveCanvas: React.FC<AdaptiveCanvasProps> = ({
  currentZone,
  cards,
  apps,
  activeCardId,
  settings,
  onUpdateCard,
  onCloseCard,
  onFocusCard,
  onOpenAppLauncher,
  notifications,
  onDismissNotification
}) => {
  const visibleCards = cards.filter(c => !c.isMinimized);

  const getWallpaperStyle = (): React.CSSProperties => {
    if (!settings) return {};
    const { wallpaperType, wallpaper, wallpaperFit } = settings;

    if (wallpaperType === 'solid') {
      return { backgroundColor: wallpaper };
    }
    if (wallpaperType === 'gradient') {
      return { background: wallpaper };
    }
    if (wallpaperType === 'custom' || wallpaperType === 'bundled') {
      const fitMap: Record<string, React.CSSProperties> = {
        fill: { backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' },
        fit: { backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' },
        stretch: { backgroundSize: '100% 100%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' },
        tile: { backgroundRepeat: 'repeat', backgroundPosition: 'top left' },
        center: { backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
      };
      return {
        backgroundImage: `url(${wallpaper})`,
        ...(fitMap[wallpaperFit] || fitMap.fill)
      };
    }
    return {};
  };

  return (
    <main 
      className="relative flex-1 w-full h-[calc(100vh-48px)] overflow-hidden select-none bg-[#090a0f]"
      style={getWallpaperStyle()}
    >
      {/* Animated Live Wallpaper Shift */}
      {settings?.wallpaperType === 'animated' && (
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-1000"
          style={{
            background: 'radial-gradient(ellipse at 40% 40%, var(--loom-accent, #6366f1) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(14, 165, 233, 0.25) 0%, transparent 50%)',
            opacity: 0.22,
            animation: 'wallpaperFloat 16s ease-in-out infinite alternate',
            backgroundSize: '150% 150%'
          }}
        />
      )}

      {/* Dynamic Ambient Background Gradient from Zone */}
      <div
        className="absolute inset-0 transition-all duration-1000 ease-out pointer-events-none"
        style={{
          background: currentZone?.ambientGradient || 'radial-gradient(ellipse at 50% 20%, rgba(99, 102, 241, 0.1) 0%, transparent 80%)'
        }}
      />

      {/* Subtle Dot Matrix Canvas Grid */}
      <div 
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Ambient Zone Watermark */}
      <div className="absolute bottom-6 left-8 pointer-events-none opacity-20 flex flex-col">
        <span className="text-3xl font-extrabold tracking-tight text-white uppercase">
          {currentZone?.name.replace('Zone', '')}
        </span>
        <span className="text-xs font-mono text-zinc-400 tracking-widest">
          {currentZone?.timeStart} — {currentZone?.timeEnd}
        </span>
      </div>

      {/* Empty Canvas Placeholder */}
      {visibleCards.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 pointer-events-auto">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md flex flex-col items-center text-center max-w-sm">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">
              {currentZone?.name || 'Context Surface'}
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              No active cards in this zone. Launch sandboxed apps or switch context.
            </p>
            <button
              onClick={onOpenAppLauncher}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-lg shadow-indigo-600/30"
            >
              Open App Registry
            </button>
          </div>
        </div>
      )}

      {/* Render Active Card Windows */}
      {cards.map(card => {
        const app = apps.find(a => a.id === card.appId);
        return (
          <CardWindow
            key={card.id}
            card={card}
            app={app}
            isActive={card.id === activeCardId}
            onUpdate={(updates) => onUpdateCard(card.id, updates)}
            onClose={() => onCloseCard(card.id)}
            onFocus={() => onFocusCard(card.id)}
          />
        );
      })}

      {/* Toast Notifications Stack */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm">
        {notifications.map(notif => (
          <div
            key={notif.id}
            onClick={() => onDismissNotification(notif.id)}
            className="pointer-events-auto p-3.5 rounded-xl bg-[#151722]/95 border border-indigo-500/30 shadow-2xl backdrop-blur-xl flex items-start gap-2.5 cursor-pointer hover:border-indigo-500/50 transition-all animate-in fade-in slide-in-from-top-2"
          >
            <div className="p-1 rounded-md bg-indigo-500/20 text-indigo-400 mt-0.5">
              <Bell className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-200">{notif.title}</span>
                <span className="text-[10px] text-zinc-500 font-mono">{notif.appId}</span>
              </div>
              <p className="text-[11.5px] text-zinc-400 mt-0.5 leading-snug">{notif.message}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
};
