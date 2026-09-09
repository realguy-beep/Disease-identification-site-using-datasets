import React, { useState } from 'react';
import type { AppStoreItem } from '../data/appStoreCatalog';
import { APP_STORE_CATALOG } from '../data/appStoreCatalog';
import type { InstalledApp, AppManifest } from '../types/manifest';
import { 
  ShoppingBag, 
  Search, 
  X, 
  Star, 
  AlertTriangle
} from 'lucide-react';

interface AppStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  installedApps: InstalledApp[];
  onInstallApp: (manifest: AppManifest) => Promise<void>;
  onLaunchApp: (app: InstalledApp) => void;
}

export const AppStoreModal: React.FC<AppStoreModalProps> = ({
  isOpen,
  onClose,
  installedApps,
  onInstallApp,
  onLaunchApp
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [reviewItem, setReviewItem] = useState<AppStoreItem | null>(null);

  if (!isOpen) return null;

  const categories = ['All', 'Productivity', 'Utilities', 'Developer', 'System'];

  const filteredCatalog = APP_STORE_CATALOG.filter(item => {
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
    }
    return true;
  });

  const featuredApps = APP_STORE_CATALOG.filter(item => item.featured);

  const handleInstallConfirmed = async () => {
    if (!reviewItem) return;
    await onInstallApp(reviewItem);
    setReviewItem(null);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl rounded-3xl bg-[#0f111a] border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] backdrop-blur-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Loom App Store</h2>
              <p className="text-[11px] text-zinc-400">Curated, sandboxed desktop applications</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 w-52">
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search catalog..."
                className="bg-transparent text-xs text-zinc-200 outline-none w-full"
              />
            </div>

            <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-white/5">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="px-6 py-2.5 bg-white/[0.02] border-b border-white/5 flex gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                selectedCategory === cat 
                  ? 'bg-pink-600 text-white font-medium shadow-md shadow-pink-600/30' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Featured Row (only when All and no search) */}
          {selectedCategory === 'All' && !search && (
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider text-[10px]">
                Featured Essentials
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {featuredApps.map(app => {
                  const isInstalled = installedApps.some(a => a.id === app.id);
                  return (
                    <div 
                      key={app.id} 
                      className="p-3.5 rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/10 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-100">{app.name}</span>
                          <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-current" /> {app.rating}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{app.description}</p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500">{app.downloads} installs</span>
                        {isInstalled ? (
                          <button
                            onClick={() => {
                              const installed = installedApps.find(a => a.id === app.id);
                              if (installed) onLaunchApp(installed);
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-medium"
                          >
                            Open
                          </button>
                        ) : (
                          <button
                            onClick={() => setReviewItem(app)}
                            className="px-3 py-1 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-medium shadow-md shadow-pink-600/30"
                          >
                            Install
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full Grid */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider text-[10px]">
              {selectedCategory} Apps ({filteredCatalog.length})
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredCatalog.map(app => {
                const isInstalled = installedApps.some(a => a.id === app.id);
                return (
                  <div
                    key={app.id}
                    className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 flex items-start justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm mt-0.5"
                        style={{ backgroundColor: `${app.themeColor || '#ec4899'}20`, color: app.themeColor || '#ec4899' }}
                      >
                        {app.name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-200">{app.name}</span>
                          <span className="text-[9.5px] bg-white/5 text-zinc-400 px-1.5 py-0.5 rounded">
                            {app.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                          {app.description}
                        </p>
                        
                        {/* Capabilities preview */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {app.permissions.map(p => (
                            <span key={p} className="text-[9px] font-mono text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-[10px] text-amber-400 flex items-center gap-0.5 font-medium">
                        <Star className="w-2.5 h-2.5 fill-current" /> {app.rating}
                      </span>
                      {isInstalled ? (
                        <button
                          onClick={() => {
                            const installed = installedApps.find(a => a.id === app.id);
                            if (installed) onLaunchApp(installed);
                            onClose();
                          }}
                          className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-medium"
                        >
                          Open
                        </button>
                      ) : (
                        <button
                          onClick={() => setReviewItem(app)}
                          className="px-3 py-1 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-medium shadow-md shadow-pink-600/30"
                        >
                          Install
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Permission Review Modal before Install */}
        {reviewItem && (
          <div 
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setReviewItem(null)}
          >
            <div 
              className="w-full max-w-md rounded-2xl bg-[#131522] border border-white/20 p-5 shadow-2xl flex flex-col gap-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                  style={{ backgroundColor: `${reviewItem.themeColor || '#ec4899'}20`, color: reviewItem.themeColor || '#ec4899' }}
                >
                  {reviewItem.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">{reviewItem.name}</h3>
                  <span className="text-[10px] text-zinc-400 font-mono">v{reviewItem.version}</span>
                </div>
              </div>

              <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex flex-col gap-2">
                <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  App Capability Permissions Request
                </span>
                <p className="text-[11px] text-zinc-400">
                  This sandboxed app is requesting access to the following system capabilities:
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {reviewItem.permissions.length === 0 ? (
                    <span className="text-[10px] text-zinc-400 italic">No special permissions requested</span>
                  ) : (
                    reviewItem.permissions.map(p => (
                      <span key={p} className="text-[10px] font-mono bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded border border-amber-500/30">
                        {p}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setReviewItem(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInstallConfirmed}
                  className="px-4 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-medium shadow-lg shadow-pink-600/30"
                >
                  Approve & Install
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
