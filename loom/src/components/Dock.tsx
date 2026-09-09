import React, { useState } from 'react';
import type { CardInstance } from '../types/card';
import type { InstalledApp } from '../types/manifest';
import type { DockPosition, DockSize } from '../types/settings';
import { 
  FileText, 
  Clipboard, 
  CheckSquare, 
  ShieldAlert, 
  Folder, 
  Terminal, 
  Settings, 
  ShoppingBag,
  Activity,
  Calculator,
  Clock,
  Code,
  Calendar,
  Image as ImageIcon,
  PlayCircle,
  CloudSun,
  Cpu
} from 'lucide-react';

interface DockProps {
  cards: CardInstance[];
  apps: InstalledApp[];
  activeCardId: string | null;
  position?: DockPosition;
  size?: DockSize;
  autoHide?: boolean;
  accentColor?: string;
  onFocusCard: (cardId: string) => void;
  onToggleMinimize: (cardId: string) => void;
  onCloseCard: (cardId: string) => void;
  onLaunchApp?: (app: InstalledApp) => void;
  onOpenAppStore: () => void;
  onOpenSettings: () => void;
}

export const Dock: React.FC<DockProps> = ({
  cards,
  apps,
  activeCardId,
  position = 'bottom',
  size = 'md',
  autoHide = false,
  accentColor = '#6366f1',
  onFocusCard,
  onToggleMinimize,
  onCloseCard,
  onOpenAppStore,
  onOpenSettings
}) => {
  const [hoveredAppId, setHoveredAppId] = useState<string | null>(null);
  const [isDockHovered, setIsDockHovered] = useState(false);
  const [contextMenuCard, setContextMenuCard] = useState<{ x: number; y: number; card: CardInstance } | null>(null);

  const getIconSizeClass = () => {
    switch (size) {
      case 'sm': return 'w-4 h-4';
      case 'lg': return 'w-6 h-6';
      default: return 'w-5 h-5';
    }
  };

  const getButtonPaddingClass = () => {
    switch (size) {
      case 'sm': return 'p-1.5 rounded-lg';
      case 'lg': return 'p-2.5 rounded-2xl';
      default: return 'p-2 rounded-xl';
    }
  };

  const renderIcon = (iconName: string, themeColor?: string) => {
    const props = { className: getIconSizeClass() };
    switch (iconName) {
      case 'Clipboard': return <Clipboard {...props} style={{ color: themeColor || '#10b981' }} />;
      case 'CheckSquare': return <CheckSquare {...props} style={{ color: themeColor || '#f59e0b' }} />;
      case 'ShieldAlert': return <ShieldAlert {...props} style={{ color: themeColor || '#38bdf8' }} />;
      case 'Folder': return <Folder {...props} style={{ color: themeColor || '#3b82f6' }} />;
      case 'Terminal': return <Terminal {...props} style={{ color: themeColor || '#10b981' }} />;
      case 'Settings': return <Settings {...props} style={{ color: themeColor || '#94a3b8' }} />;
      case 'Activity': return <Activity {...props} style={{ color: themeColor || '#ef4444' }} />;
      case 'ShoppingBag': return <ShoppingBag {...props} style={{ color: themeColor || '#ec4899' }} />;
      case 'Calculator': return <Calculator {...props} style={{ color: themeColor || '#818cf8' }} />;
      case 'Clock': return <Clock {...props} style={{ color: themeColor || '#f59e0b' }} />;
      case 'Code': return <Code {...props} style={{ color: themeColor || '#06b6d4' }} />;
      case 'Calendar': return <Calendar {...props} style={{ color: themeColor || '#ec4899' }} />;
      case 'Image': return <ImageIcon {...props} style={{ color: themeColor || '#8b5cf6' }} />;
      case 'PlayCircle': return <PlayCircle {...props} style={{ color: themeColor || '#10b981' }} />;
      case 'CloudSun': return <CloudSun {...props} style={{ color: themeColor || '#38bdf8' }} />;
      case 'Cpu': return <Cpu {...props} style={{ color: themeColor || '#a855f7' }} />;
      default: return <FileText {...props} style={{ color: themeColor || '#818cf8' }} />;
    }
  };

  const handleCardClick = (card: CardInstance) => {
    if (card.isMinimized) {
      onToggleMinimize(card.id);
      onFocusCard(card.id);
    } else if (activeCardId === card.id) {
      onToggleMinimize(card.id);
    } else {
      onFocusCard(card.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, card: CardInstance) => {
    e.preventDefault();
    setContextMenuCard({ x: e.clientX, y: e.clientY - 100, card });
  };

  const getDockPositionClasses = () => {
    switch (position) {
      case 'top': return 'top-14 left-1/2 -translate-x-1/2';
      case 'left': return 'left-3 top-1/2 -translate-y-1/2';
      case 'right': return 'right-3 top-1/2 -translate-y-1/2';
      default: return 'bottom-3 left-1/2 -translate-x-1/2';
    }
  };

  const isVertical = position === 'left' || position === 'right';

  const getHiddenTransform = () => {
    if (!autoHide || isDockHovered) return '';
    switch (position) {
      case 'top': return '-translate-y-28 opacity-0 pointer-events-none';
      case 'left': return '-translate-x-28 opacity-0 pointer-events-none';
      case 'right': return 'translate-x-28 opacity-0 pointer-events-none';
      default: return 'translate-y-28 opacity-0 pointer-events-none';
    }
  };

  return (
    <>
      {/* Auto-hide Sensor Area */}
      {autoHide && (
        <div
          onMouseEnter={() => setIsDockHovered(true)}
          className={`fixed z-35 ${
            position === 'bottom' ? 'bottom-0 left-0 right-0 h-3' :
            position === 'top' ? 'top-12 left-0 right-0 h-3' :
            position === 'left' ? 'top-12 bottom-0 left-0 w-3' :
            'top-12 bottom-0 right-0 w-3'
          }`}
        />
      )}

      <div 
        className={`fixed z-40 select-none transition-all duration-300 ${getDockPositionClasses()} ${getHiddenTransform()}`}
        onMouseEnter={() => setIsDockHovered(true)}
        onMouseLeave={() => setIsDockHovered(false)}
      >
        <div className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#0d0f17]/85 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/80 hover:border-white/20 transition-all duration-300 ${
          isVertical ? 'flex-col' : 'flex-row'
        }`}>
          
          {/* Running cards */}
          {cards.map(card => {
            const app = apps.find(a => a.id === card.appId);
            const isActive = activeCardId === card.id && !card.isMinimized;
            const isHovered = hoveredAppId === card.id;

            return (
              <div 
                key={card.id} 
                className="relative group"
                onMouseEnter={() => setHoveredAppId(card.id)}
                onMouseLeave={() => setHoveredAppId(null)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className={`absolute px-2.5 py-1 rounded-lg bg-[#181a26] border border-white/10 text-[11px] font-medium text-zinc-200 shadow-xl whitespace-nowrap z-50 pointer-events-none animate-in fade-in zoom-95 ${
                    position === 'top' ? 'top-12 left-1/2 -translate-x-1/2' :
                    position === 'left' ? 'left-14 top-1/2 -translate-y-1/2' :
                    position === 'right' ? 'right-14 top-1/2 -translate-y-1/2' :
                    '-top-10 left-1/2 -translate-x-1/2'
                  }`}>
                    {card.title} {card.isMinimized && '(Minimized)'}
                  </div>
                )}

                <button
                  onClick={() => handleCardClick(card)}
                  onContextMenu={(e) => handleContextMenu(e, card)}
                  style={isActive ? { 
                    boxShadow: `0 0 0 1px ${accentColor}80, 0 8px 16px -4px ${accentColor}30`, 
                    backgroundColor: 'rgba(255, 255, 255, 0.12)' 
                  } : undefined}
                  className={`relative ${getButtonPaddingClass()} transition-all duration-200 flex items-center justify-center ${
                    isActive 
                      ? 'scale-105' 
                      : 'hover:bg-white/10 hover:scale-110 active:scale-95'
                  }`}
                  aria-label={card.title}
                >
                  {renderIcon(app?.icon || 'FileText', app?.themeColor)}
                  
                  {/* Running status dot */}
                  <span 
                    style={isActive ? { backgroundColor: accentColor } : undefined}
                    className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded-full transition-all duration-200 ${
                      isActive 
                        ? 'w-2 h-1' 
                        : card.isMinimized 
                        ? 'w-1 h-1 bg-zinc-500' 
                        : 'w-1.5 h-1 bg-emerald-400'
                    }`}
                  />
                </button>
              </div>
            );
          })}

          {cards.length > 0 && (
            <div className={isVertical ? "w-6 h-px bg-white/10 my-1" : "w-px h-6 bg-white/10 mx-1"} />
          )}

          {/* Quick System Launchers */}
          <div className={`flex items-center gap-1 ${isVertical ? 'flex-col' : 'flex-row'}`}>
            <button
              onClick={onOpenAppStore}
              title="Loom App Store"
              className={`${getButtonPaddingClass()} hover:bg-white/10 hover:scale-110 active:scale-95 transition-all text-pink-400`}
              aria-label="App Store"
            >
              <ShoppingBag className={getIconSizeClass()} />
            </button>

            <button
              onClick={onOpenSettings}
              title="System Settings"
              className={`${getButtonPaddingClass()} hover:bg-white/10 hover:scale-110 active:scale-95 transition-all text-zinc-400 hover:text-zinc-200`}
              aria-label="Settings"
            >
              <Settings className={getIconSizeClass()} />
            </button>
          </div>
        </div>
      </div>

      {/* Card Context Menu */}
      {contextMenuCard && (
        <div 
          className="fixed z-50 w-44 rounded-xl bg-[#12141f] border border-white/15 shadow-2xl p-1 text-xs text-zinc-300 backdrop-blur-xl"
          style={{ left: contextMenuCard.x - 70, top: contextMenuCard.y }}
          onMouseLeave={() => setContextMenuCard(null)}
        >
          <div className="px-2 py-1 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider border-b border-white/5">
            {contextMenuCard.card.title}
          </div>
          <button
            onClick={() => {
              onToggleMinimize(contextMenuCard.card.id);
              setContextMenuCard(null);
            }}
            className="w-full text-left px-2 py-1.5 rounded hover:bg-white/10 transition-colors"
          >
            {contextMenuCard.card.isMinimized ? 'Restore' : 'Minimize'}
          </button>
          <button
            onClick={() => {
              onFocusCard(contextMenuCard.card.id);
              setContextMenuCard(null);
            }}
            className="w-full text-left px-2 py-1.5 rounded hover:bg-white/10 transition-colors"
          >
            Bring to Front
          </button>
          <div className="my-1 border-t border-white/5" />
          <button
            onClick={() => {
              onCloseCard(contextMenuCard.card.id);
              setContextMenuCard(null);
            }}
            className="w-full text-left px-2 py-1.5 rounded text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Close Card
          </button>
        </div>
      )}
    </>
  );
};
