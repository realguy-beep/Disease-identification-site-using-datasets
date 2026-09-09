import React, { useState } from 'react';
import type { ZoneDefinition } from '../types/zone';
import type { InstalledApp } from '../types/manifest';
import { X, Sun, Zap, Moon, Plus, Check, Clock, Trash2 } from 'lucide-react';

interface ZoneManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  zones: ZoneDefinition[];
  apps: InstalledApp[];
  onSaveZone: (zone: ZoneDefinition) => Promise<void>;
  onDeleteZone: (zoneId: string) => Promise<void>;
}

export const ZoneManagerModal: React.FC<ZoneManagerModalProps> = ({
  isOpen,
  onClose,
  zones,
  apps,
  onSaveZone,
  onDeleteZone
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Zap');
  const [timeStart, setTimeStart] = useState('09:00');
  const [timeEnd, setTimeEnd] = useState('17:00');
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [accentColor, setAccentColor] = useState('#6366f1');

  if (!isOpen) return null;

  const handleToggleApp = (appId: string) => {
    if (selectedApps.includes(appId)) {
      setSelectedApps(selectedApps.filter(id => id !== appId));
    } else {
      setSelectedApps([...selectedApps, appId]);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    const newZone: ZoneDefinition = {
      id: `zone-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || 'Custom Loom workspace zone',
      icon,
      timeStart,
      timeEnd,
      defaultAppIds: selectedApps,
      accentColor,
      ambientGradient: `radial-gradient(ellipse at 50% 20%, ${accentColor}25 0%, transparent 70%)`
    };

    await onSaveZone(newZone);
    setIsCreating(false);
    setName('');
    setDescription('');
    setSelectedApps([]);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl rounded-2xl bg-[#10121c] border border-white/15 shadow-2xl overflow-hidden flex flex-col backdrop-blur-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Adaptive Canvas Zones</h2>
            <p className="text-[11px] text-zinc-400">Configure time-based contextual card clusters</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[70vh] flex flex-col gap-4">
          {/* Zones List */}
          <div className="flex flex-col gap-2.5">
            {zones.map(zone => (
              <div
                key={zone.id}
                className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-start justify-between"
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold mt-0.5"
                    style={{ backgroundColor: `${zone.accentColor}20`, color: zone.accentColor }}
                  >
                    {zone.icon === 'Sun' ? <Sun className="w-4 h-4" /> : zone.icon === 'Moon' ? <Moon className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-200">{zone.name}</span>
                      <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
                        <Clock className="w-2.5 h-2.5" />
                        {zone.timeStart} – {zone.timeEnd}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{zone.description}</p>
                    
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {zone.defaultAppIds.map(appId => {
                        const app = apps.find(a => a.id === appId);
                        return (
                          <span
                            key={appId}
                            className="text-[9.5px] bg-white/5 border border-white/10 text-zinc-300 px-1.5 py-0.5 rounded"
                          >
                            {app?.name || appId}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {!zone.isDefault && (
                  <button
                    onClick={() => onDeleteZone(zone.id)}
                    className="p-1 text-zinc-500 hover:text-red-400 rounded transition-colors"
                    title="Delete Zone"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add Custom Zone */}
          {isCreating ? (
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/15 flex flex-col gap-3">
              <span className="text-xs font-semibold text-zinc-200">New Custom Zone</span>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Zone Name (e.g. Brainstorm Sprint)"
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-100 outline-none focus:border-indigo-500"
                />

                <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                  <input
                    type="time"
                    value={timeStart}
                    onChange={e => setTimeStart(e.target.value)}
                    className="bg-[#151722] border border-white/10 rounded px-2 py-1 text-zinc-200 outline-none"
                  />
                  <span>to</span>
                  <input
                    type="time"
                    value={timeEnd}
                    onChange={e => setTimeEnd(e.target.value)}
                    className="bg-[#151722] border border-white/10 rounded px-2 py-1 text-zinc-200 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Zone purpose description..."
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-300 outline-none"
                />

                <div className="flex items-center gap-2">
                  <select
                    value={icon}
                    onChange={e => setIcon(e.target.value)}
                    className="bg-[#151722] border border-white/10 rounded px-2 py-1 text-xs text-zinc-200 outline-none"
                  >
                    <option value="Zap">Icon: Zap</option>
                    <option value="Sun">Icon: Sun</option>
                    <option value="Moon">Icon: Moon</option>
                  </select>

                  <select
                    value={accentColor}
                    onChange={e => setAccentColor(e.target.value)}
                    className="bg-[#151722] border border-white/10 rounded px-2 py-1 text-xs text-zinc-200 outline-none"
                  >
                    <option value="#6366f1">Indigo</option>
                    <option value="#10b981">Emerald</option>
                    <option value="#f59e0b">Amber</option>
                    <option value="#8b5cf6">Purple</option>
                    <option value="#ec4899">Pink</option>
                  </select>
                </div>
              </div>

              {/* Default Apps selector */}
              <div>
                <label className="text-[11px] font-medium text-zinc-400 mb-1.5 block">
                  Select Default Apps for this Zone:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {apps.map(app => {
                    const isSelected = selectedApps.includes(app.id);
                    return (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => handleToggleApp(app.id)}
                        className={`p-2 rounded-lg border text-left text-xs flex items-center justify-between transition-colors ${
                          isSelected 
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200' 
                            : 'bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <span className="truncate">{app.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
                >
                  Save Zone
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-white/15 text-xs text-zinc-400 hover:text-zinc-200 hover:border-white/30 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Custom Context Zone</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
