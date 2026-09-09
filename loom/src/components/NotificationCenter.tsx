import React from 'react';
import type { LoomNotification } from '../types/notification';
import type { InstalledApp } from '../types/manifest';
import { Bell, BellOff, Trash2, X } from 'lucide-react';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: LoomNotification[];
  dnd: boolean;
  onToggleDnd: () => void;
  onClearAll: () => void;
  onDismiss: (id: string) => void;
  apps: InstalledApp[];
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  dnd,
  onToggleDnd,
  onClearAll,
  onDismiss,
  apps
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-transparent flex justify-end select-none"
      onClick={onClose}
    >
      <div 
        className="w-80 sm:w-96 h-screen bg-[#0e1019]/95 border-l border-white/10 shadow-2xl backdrop-blur-2xl flex flex-col animate-in slide-in-from-right duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-zinc-100">Notification Center</span>
            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full text-zinc-400 font-mono">
              {notifications.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleDnd}
              title={dnd ? 'Disable Do Not Disturb' : 'Enable Do Not Disturb'}
              className={`p-1.5 rounded-lg border transition-colors ${
                dnd 
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {dnd ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
            </button>

            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                title="Clear All Notifications"
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* DND Status Banner */}
        {dnd && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-[11px] text-amber-300">
            <span>Do Not Disturb is active. Popups are muted.</span>
            <button onClick={onToggleDnd} className="underline hover:text-white">Turn Off</button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {notifications.map(notif => {
            const app = apps.find(a => a.id === notif.appId);
            return (
              <div
                key={notif.id}
                className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 flex flex-col gap-1.5 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span className="text-[11px] font-semibold text-zinc-200 truncate max-w-[170px]">
                      {notif.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[9.5px] text-zinc-500 font-mono">
                      {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={() => onDismiss(notif.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-500 hover:text-red-400 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <p className="text-[11.5px] text-zinc-400 leading-relaxed pl-3.5">
                  {notif.message}
                </p>

                <div className="flex items-center justify-between pl-3.5 pt-1 text-[9.5px] text-zinc-500 font-mono">
                  <span>{app?.name || notif.appId}</span>
                </div>
              </div>
            );
          })}

          {notifications.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-500">
              <Bell className="w-8 h-8 opacity-20 mb-2" />
              <span className="text-xs font-medium">All caught up</span>
              <span className="text-[11px] mt-0.5">No notifications in your history</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
