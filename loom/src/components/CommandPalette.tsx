import React, { useState, useEffect, useRef } from 'react';
import type { StateItem } from '../types/state';
import type { InstalledApp } from '../types/manifest';
import type { ZoneDefinition } from '../types/zone';
import type { VFSNode } from '../types/vfs';
import { 
  Search, 
  FileText, 
  CheckSquare, 
  Link, 
  Code, 
  Layers, 
  ArrowRight,
  Database,
  Folder,
  Settings,
  Globe,
  Sliders,
  Calculator,
  Clock,
  Calendar as CalendarIcon
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  stateItems: StateItem[];
  apps: InstalledApp[];
  files?: VFSNode[];
  zones?: ZoneDefinition[];
  onSelectStateItem: (item: StateItem) => void;
  onSelectFile?: (file: VFSNode) => void;
  onLaunchApp: (app: InstalledApp) => void;
  onSelectZone?: (zone: ZoneDefinition) => void;
  onCreateStateItem: (type: StateItem['type']) => void;
  onOpenAppLauncher: () => void;
  onOpenSettings?: (tab?: string) => void;
  onExportState: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  stateItems,
  apps,
  files = [],
  onSelectStateItem,
  onSelectFile,
  onLaunchApp,
  onCreateStateItem,
  onOpenAppLauncher,
  onOpenSettings,
  onExportState
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  // 1. Instant Math Calculation Evaluation (e.g. 5+5 -> 10, 12 * 8.5, sqrt(144))
  let mathAction: Array<{ id: string; title: string; category: string; icon: React.ReactNode; run: () => void }> = [];
  try {
    const rawMath = query.trim();
    if (/[0-9]/.test(rawMath)) {
      const sanitized = rawMath
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/\^/g, '**')
        .replace(/pi/gi, 'Math.PI')
        .replace(/e\b/gi, 'Math.E')
        .replace(/sqrt\(/gi, 'Math.sqrt(')
        .replace(/sin\(/gi, 'Math.sin(')
        .replace(/cos\(/gi, 'Math.cos(');

      if (/^[0-9+\-*/(). %*MathPIEsqrtcni]+$/.test(sanitized) && /[+\-*/%^]/.test(sanitized)) {
        const evalRes = Function('"use strict"; return (' + sanitized + ')')();
        if (typeof evalRes === 'number' && !isNaN(evalRes) && isFinite(evalRes)) {
          const formatted = Number(evalRes.toFixed(8)).toString();
          mathAction = [{
            id: 'act-math',
            title: `${rawMath} = ${formatted} (Click to copy & open Calc)`,
            category: 'Quick Calculation',
            icon: <Calculator className="w-4 h-4 text-indigo-400" />,
            run: () => {
              navigator.clipboard?.writeText(formatted);
              const calc = apps.find(a => a.id === 'loom.calculator');
              if (calc) onLaunchApp(calc);
            }
          }];
        }
      }
    }
  } catch (e) {}

  // 2. Quick Timer Action (e.g. "timer 10m", "timer 5m", "alarm 45s")
  let timerAction: Array<{ id: string; title: string; category: string; icon: React.ReactNode; run: () => void }> = [];
  const timerMatch = q.match(/^(?:timer|alarm|countdown)\s+(\d+)\s*(m|s|min|sec|minutes?|seconds?)?$/i);
  if (timerMatch) {
    const val = parseInt(timerMatch[1], 10);
    const unitStr = (timerMatch[2] || 'm').toLowerCase();
    const isSec = unitStr.startsWith('s');
    const totalSecs = isSec ? val : val * 60;
    const label = isSec ? `${val} second` : `${val} minute`;
    timerAction = [{
      id: 'act-quick-timer',
      title: `Start ${label} countdown timer`,
      category: 'Quick Clock & Timer',
      icon: <Clock className="w-4 h-4 text-amber-400" />,
      run: () => {
        const timerApp = apps.find(a => a.id === 'loom.timer');
        if (timerApp) {
          onLaunchApp({
            ...timerApp,
            url: `/apps/timer.html?time=${totalSecs}`
          });
        }
      }
    }];
  }

  // 3. Apps matching
  const filteredApps = apps.filter(a => {
    if (!q) return false;
    return a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || (a.description ? a.description.toLowerCase().includes(q) : false);
  }).slice(0, 3);

  // 4. Calendar Events matching
  const calendarEvents = stateItems.filter(item => {
    if (item.type !== 'calendar_event') return false;
    if (!q) return false;
    return item.title.toLowerCase().includes(q) || item.content.toLowerCase().includes(q);
  }).slice(0, 3).map(item => ({
    id: item.id,
    title: `Calendar: ${item.title}`,
    category: 'Calendar Event',
    icon: <CalendarIcon className="w-4 h-4 text-pink-400" />,
    run: () => onSelectStateItem(item)
  }));

  // 5. VFS Files matching
  const filteredFiles = files.filter(f => {
    if (!q) return false;
    return !f.isTrash && f.name.toLowerCase().includes(q);
  }).slice(0, 3);

  // 6. Universal State items matching
  const filteredState = stateItems.filter(item => {
    if (item.type === 'calendar_event') return false;
    if (!q) return true;
    if (q.startsWith('#')) {
      const tagQuery = q.slice(1);
      return item.tags?.some(t => t.toLowerCase().includes(tagQuery));
    }
    return (
      item.title.toLowerCase().includes(q) ||
      item.content.toLowerCase().includes(q) ||
      item.tags?.some(t => t.toLowerCase().includes(q))
    );
  }).slice(0, 4);

  // 7. System & Settings shortcuts
  const settingsActions = [
    {
      id: 'set-personalization',
      title: 'Settings: Wallpaper, Themes & Personalization',
      category: 'Settings',
      icon: <Sliders className="w-4 h-4 text-indigo-400" />,
      run: () => onOpenSettings ? onOpenSettings('personalization') : onOpenAppLauncher()
    },
    {
      id: 'set-appearance',
      title: 'Settings: Window Styling, Glass & Blur',
      category: 'Settings',
      icon: <Sliders className="w-4 h-4 text-sky-400" />,
      run: () => onOpenSettings ? onOpenSettings('appearance') : onOpenAppLauncher()
    },
    {
      id: 'set-dock',
      title: 'Settings: Dock Position & Taskbar Auto-hide',
      category: 'Settings',
      icon: <Layers className="w-4 h-4 text-amber-400" />,
      run: () => onOpenSettings ? onOpenSettings('dock') : onOpenAppLauncher()
    },
    {
      id: 'set-apps',
      title: 'Settings: App Permissions & Capabilities',
      category: 'Settings',
      icon: <Settings className="w-4 h-4 text-emerald-400" />,
      run: () => onOpenSettings ? onOpenSettings('apps') : onOpenAppLauncher()
    },
    {
      id: 'set-storage',
      title: 'Settings: Storage Management & Quotas',
      category: 'Settings',
      icon: <Database className="w-4 h-4 text-purple-400" />,
      run: () => onOpenSettings ? onOpenSettings('storage') : onExportState()
    }
  ].filter(act => !q || act.title.toLowerCase().includes(q));

  // 8. Quick Creation Actions
  const createActions = [
    {
      id: 'act-note',
      title: 'Create New Note',
      category: 'Action',
      icon: <FileText className="w-4 h-4 text-indigo-400" />,
      run: () => onCreateStateItem('note')
    },
    {
      id: 'act-task',
      title: 'Create New Task',
      category: 'Action',
      icon: <CheckSquare className="w-4 h-4 text-amber-400" />,
      run: () => onCreateStateItem('task')
    },
    {
      id: 'act-snippet',
      title: 'Create Code Snippet',
      category: 'Action',
      icon: <Code className="w-4 h-4 text-emerald-400" />,
      run: () => onCreateStateItem('snippet')
    },
    {
      id: 'act-export',
      title: 'Backup Full OS State (JSON)',
      category: 'Data',
      icon: <Database className="w-4 h-4 text-purple-400" />,
      run: () => onExportState()
    }
  ].filter(act => !q || act.title.toLowerCase().includes(q));

  // 9. Web fallback action
  const webAction = q ? [
    {
      id: 'act-web',
      title: `Search DuckDuckGo for "${query}"`,
      category: 'Web',
      icon: <Globe className="w-4 h-4 text-sky-400" />,
      run: () => window.open(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, '_blank')
    }
  ] : [];

  // Flattened results for keyboard selection with math and quick timer prioritized
  const allResults: Array<{ type: 'app' | 'file' | 'state' | 'action'; data: any }> = [
    ...mathAction.map(act => ({ type: 'action' as const, data: act })),
    ...timerAction.map(act => ({ type: 'action' as const, data: act })),
    ...filteredApps.map(app => ({ type: 'app' as const, data: app })),
    ...calendarEvents.map(act => ({ type: 'action' as const, data: act })),
    ...filteredFiles.map(file => ({ type: 'file' as const, data: file })),
    ...filteredState.map(item => ({ type: 'state' as const, data: item })),
    ...settingsActions.map(act => ({ type: 'action' as const, data: act })),
    ...createActions.map(act => ({ type: 'action' as const, data: act })),
    ...webAction.map(act => ({ type: 'action' as const, data: act }))
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (allResults.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (allResults.length || 1)) % (allResults.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = allResults[selectedIndex];
      if (current) {
        if (current.type === 'app') onLaunchApp(current.data);
        else if (current.type === 'file' && onSelectFile) onSelectFile(current.data);
        else if (current.type === 'state') onSelectStateItem(current.data);
        else if (current.type === 'action') current.data.run();
        onClose();
      }
    }
  };

  const renderTypeIcon = (type: StateItem['type']) => {
    switch (type) {
      case 'note': return <FileText className="w-3.5 h-3.5 text-indigo-400" />;
      case 'task': return <CheckSquare className="w-3.5 h-3.5 text-amber-400" />;
      case 'link': return <Link className="w-3.5 h-3.5 text-sky-400" />;
      case 'snippet': return <Code className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 px-4 select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl rounded-2xl bg-[#0f111a] border border-white/15 shadow-2xl overflow-hidden flex flex-col backdrop-blur-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
          <Search className="w-4 h-4 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Spotlight search files, notes, apps, settings..."
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
          />
          <kbd className="text-[10px] bg-white/5 border border-white/10 text-zinc-400 px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="max-h-88 overflow-y-auto p-2 flex flex-col gap-1">
          {/* Apps */}
          {filteredApps.length > 0 && (
            <div className="mb-1">
              <div className="text-[10px] uppercase font-semibold text-zinc-500 px-2.5 py-1 tracking-wider">
                Installed Apps
              </div>
              {filteredApps.map((app, idx) => {
                const globalIndex = idx;
                const isSelected = selectedIndex === globalIndex;
                return (
                  <button
                    key={app.id}
                    onClick={() => {
                      onLaunchApp(app);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors ${
                      isSelected ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1 rounded bg-white/5 text-indigo-400">
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-medium text-zinc-200">{app.name}</span>
                    </div>
                    <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                      Open
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* VFS Files */}
          {filteredFiles.length > 0 && (
            <div className="mb-1">
              <div className="text-[10px] uppercase font-semibold text-zinc-500 px-2.5 py-1 tracking-wider">
                Virtual Files
              </div>
              {filteredFiles.map((file, idx) => {
                const globalIndex = filteredApps.length + idx;
                const isSelected = selectedIndex === globalIndex;
                return (
                  <button
                    key={file.id}
                    onClick={() => {
                      if (onSelectFile) onSelectFile(file);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors ${
                      isSelected ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1 rounded bg-white/5 text-blue-400">
                        <Folder className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-medium text-zinc-200">{file.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Universal State */}
          {filteredState.length > 0 && (
            <div className="mb-1">
              <div className="text-[10px] uppercase font-semibold text-zinc-500 px-2.5 py-1 tracking-wider">
                Universal State
              </div>
              {filteredState.map((item, idx) => {
                const globalIndex = filteredApps.length + filteredFiles.length + idx;
                const isSelected = selectedIndex === globalIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectStateItem(item);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors ${
                      isSelected ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="p-1 rounded bg-white/5">
                        {renderTypeIcon(item.type)}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-medium text-zinc-200 truncate">
                          {item.title}
                        </span>
                        <span className="text-[11px] text-zinc-400 line-clamp-1">
                          {item.content || 'Empty content'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Settings & System Actions */}
          {(settingsActions.length > 0 || createActions.length > 0) && (
            <div>
              <div className="text-[10px] uppercase font-semibold text-zinc-500 px-2.5 py-1 tracking-wider">
                System & Settings
              </div>
              {[...settingsActions, ...createActions].map((act, idx) => {
                const globalIndex = filteredApps.length + filteredFiles.length + filteredState.length + idx;
                const isSelected = selectedIndex === globalIndex;
                return (
                  <button
                    key={act.id}
                    onClick={() => {
                      act.run();
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors ${
                      isSelected ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1 rounded bg-white/5">
                        {act.icon}
                      </div>
                      <span className="text-xs font-medium text-zinc-200">{act.title}</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-zinc-500" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Web Fallback */}
          {webAction.length > 0 && (
            <div className="mt-1 pt-1 border-t border-white/5">
              {webAction.map((act) => {
                const globalIndex = allResults.length - 1;
                const isSelected = selectedIndex === globalIndex;
                return (
                  <button
                    key={act.id}
                    onClick={() => {
                      act.run();
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors ${
                      isSelected ? 'bg-sky-600/20 border border-sky-500/30 text-sky-300' : 'hover:bg-white/5 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {act.icon}
                      <span className="text-xs font-medium">{act.title}</span>
                    </div>
                    <span className="text-[10px] opacity-70">Web Search ↗</span>
                  </button>
                );
              })}
            </div>
          )}

          {allResults.length === 0 && (
            <div className="py-8 text-center text-xs text-zinc-500">
              No matching files, notes, or apps found for "{query}".
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-white/[0.02] border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500">
          <span>Navigate: <kbd>↑</kbd> <kbd>↓</kbd></span>
          <span>Execute: <kbd>↵</kbd></span>
          <span>Close: <kbd>ESC</kbd></span>
        </div>
      </div>
    </div>
  );
};
