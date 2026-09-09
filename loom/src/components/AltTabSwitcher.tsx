import React from 'react';
import type { CardInstance } from '../types/card';
import type { InstalledApp } from '../types/manifest';
import { FileText, Clipboard, CheckSquare, ShieldAlert, Folder, Terminal, Settings } from 'lucide-react';

interface AltTabSwitcherProps {
  isOpen: boolean;
  cards: CardInstance[];
  apps: InstalledApp[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onConfirm: (cardId: string) => void;
  onClose: () => void;
}

export const AltTabSwitcher: React.FC<AltTabSwitcherProps> = ({
  isOpen,
  cards,
  apps,
  selectedIndex,
  onSelectIndex,
  onConfirm,
  onClose
}) => {
  if (!isOpen || cards.length === 0) return null;

  const renderIcon = (iconName: string, themeColor?: string) => {
    const props = { className: "w-6 h-6" };
    switch (iconName) {
      case 'Clipboard': return <Clipboard {...props} style={{ color: themeColor || '#10b981' }} />;
      case 'CheckSquare': return <CheckSquare {...props} style={{ color: themeColor || '#f59e0b' }} />;
      case 'ShieldAlert': return <ShieldAlert {...props} style={{ color: themeColor || '#38bdf8' }} />;
      case 'Folder': return <Folder {...props} style={{ color: themeColor || '#3b82f6' }} />;
      case 'Terminal': return <Terminal {...props} style={{ color: themeColor || '#10b981' }} />;
      case 'Settings': return <Settings {...props} style={{ color: themeColor || '#94a3b8' }} />;
      default: return <FileText {...props} style={{ color: themeColor || '#818cf8' }} />;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="max-w-4xl p-4 rounded-3xl bg-[#0e1019]/90 border border-white/20 shadow-2xl shadow-black flex items-center gap-3 backdrop-blur-2xl"
        onClick={e => e.stopPropagation()}
      >
        {cards.map((card, idx) => {
          const app = apps.find(a => a.id === card.appId);
          const isSelected = selectedIndex === idx;

          return (
            <button
              key={card.id}
              onClick={() => onConfirm(card.id)}
              onMouseEnter={() => onSelectIndex(idx)}
              className={`flex flex-col items-center justify-between w-36 h-40 p-3 rounded-2xl transition-all duration-200 border ${
                isSelected 
                  ? 'bg-white/15 border-indigo-500 shadow-xl shadow-indigo-500/20 scale-105 ring-2 ring-indigo-500/40' 
                  : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08]'
              }`}
            >
              {/* App Thumbnail Simulator */}
              <div className="w-full h-20 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center relative overflow-hidden">
                <div className="p-2 rounded-xl bg-white/5">
                  {renderIcon(app?.icon || 'FileText', app?.themeColor)}
                </div>
                {card.isMinimized && (
                  <span className="absolute bottom-1 right-1 text-[9px] bg-black/60 px-1 rounded text-zinc-400">
                    min
                  </span>
                )}
              </div>

              {/* Title & info */}
              <div className="flex flex-col items-center text-center mt-2 w-full">
                <span className="text-xs font-semibold text-zinc-100 truncate w-full">
                  {card.title}
                </span>
                <span className="text-[10px] text-zinc-400 truncate font-mono">
                  {app?.name || card.appId}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
