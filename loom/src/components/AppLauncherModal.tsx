import React, { useState } from 'react';
import type { InstalledApp, AppManifest } from '../types/manifest';
import { validateManifest } from '../services/security';
import { 
  X, 
  Layers, 
  ShieldCheck, 
  ShieldAlert, 
  Trash2, 
  Check, 
  AlertTriangle, 
  Play 
} from 'lucide-react';

interface AppLauncherModalProps {
  isOpen: boolean;
  onClose: () => void;
  apps: InstalledApp[];
  onLaunchApp: (app: InstalledApp) => void;
  onInstallApp: (manifest: AppManifest) => Promise<void>;
  onUninstallApp: (appId: string) => Promise<void>;
}

export const AppLauncherModal: React.FC<AppLauncherModalProps> = ({
  isOpen,
  onClose,
  apps,
  onLaunchApp,
  onInstallApp,
  onUninstallApp
}) => {
  const [activeTab, setActiveTab] = useState<'installed' | 'install'>('installed');
  const [manifestInput, setManifestInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [pendingManifest, setPendingManifest] = useState<AppManifest | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  // Handle manifest URL fetch
  const handleFetchManifestUrl = async () => {
    if (!urlInput.trim()) return;
    setIsFetchingUrl(true);
    setValidationErrors([]);
    setPendingManifest(null);

    try {
      // Validate scheme before fetch
      const parsed = new URL(urlInput.trim());
      if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
        setValidationErrors(['Only https:// manifest URLs are accepted for security.']);
        setIsFetchingUrl(false);
        return;
      }

      const res = await fetch(urlInput.trim());
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const json = await res.json();
      inspectJson(json);
    } catch (err: any) {
      setValidationErrors([`Failed to fetch manifest from URL: ${err.message}`]);
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // Inspect raw JSON
  const handleInspectRawJson = () => {
    setValidationErrors([]);
    setPendingManifest(null);
    try {
      const json = JSON.parse(manifestInput);
      inspectJson(json);
    } catch (err: any) {
      setValidationErrors([`Invalid JSON syntax: ${err.message}`]);
    }
  };

  const inspectJson = (json: unknown) => {
    const res = validateManifest(json);
    if (!res.isValid) {
      setValidationErrors(res.errors);
    } else if (res.manifest) {
      setPendingManifest(res.manifest);
    }
  };

  // Confirm installation with approved permissions
  const handleApproveAndInstall = async () => {
    if (!pendingManifest) return;
    try {
      await onInstallApp(pendingManifest);
      setInstallSuccess(true);
      setPendingManifest(null);
      setManifestInput('');
      setUrlInput('');
      setTimeout(() => {
        setInstallSuccess(false);
        setActiveTab('installed');
      }, 1200);
    } catch (err: any) {
      setValidationErrors([`Installation failed: ${err.message}`]);
    }
  };

  // Quick preset loader
  const loadPreset = (preset: 'sample' | 'malformed') => {
    if (preset === 'sample') {
      const sample = {
        id: "com.example.markdown-preview",
        name: "Zen Markdown Viewer",
        version: "1.1.0",
        description: "Distraction-free markdown renderer with local storage capability",
        icon: "FileCode",
        url: "https://example.com/app.html",
        permissions: ["storage:read", "storage:write", "state:read"]
      };
      setManifestInput(JSON.stringify(sample, null, 2));
    } else {
      const malformed = {
        id: "bad_app",
        name: "Unsafe Script Injector",
        version: "not-semver",
        url: "javascript:alert(1)", // disallowed scheme
        permissions: ["eval:unrestricted", "system:root"] // disallowed capabilities
      };
      setManifestInput(JSON.stringify(malformed, null, 2));
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl rounded-2xl bg-[#10121b] border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] backdrop-blur-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">App Registry & Launcher</h2>
              <p className="text-[11px] text-zinc-400">Manage sandboxed apps & install via JSON manifests</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-white/5 p-0.5 border border-white/10 text-xs">
              <button
                onClick={() => setActiveTab('installed')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'installed' ? 'bg-indigo-600 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Installed ({apps.length})
              </button>
              <button
                onClick={() => setActiveTab('install')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'install' ? 'bg-indigo-600 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                + Install Manifest
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab 1: Installed Apps Grid */}
        {activeTab === 'installed' && (
          <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {apps.map(app => (
              <div
                key={app.id}
                className="flex flex-col justify-between p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs"
                        style={{ backgroundColor: `${app.themeColor || '#6366f1'}20`, color: app.themeColor || '#818cf8' }}
                      >
                        {app.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-zinc-200">{app.name}</h3>
                        <span className="text-[10px] text-zinc-500 font-mono">v{app.version}</span>
                      </div>
                    </div>

                    {app.isBuiltin ? (
                      <span className="text-[10px] bg-white/5 border border-white/10 text-zinc-400 px-1.5 py-0.5 rounded">
                        Built-in
                      </span>
                    ) : (
                      <button
                        title="Uninstall App"
                        onClick={() => onUninstallApp(app.id)}
                        className="p-1 text-zinc-500 hover:text-red-400 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="text-[11.5px] text-zinc-400 mt-2 line-clamp-2">
                    {app.description || 'Sandboxed Loom application'}
                  </p>

                  {/* Permissions Chips */}
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {app.permissions.map(perm => (
                      <span
                        key={perm}
                        className="text-[9px] font-mono bg-white/[0.04] text-zinc-400 border border-white/5 px-1.5 py-0.5 rounded"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[150px]">
                    {app.url}
                  </span>
                  <button
                    onClick={() => {
                      onLaunchApp(app);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Launch
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Install via Manifest */}
        {activeTab === 'install' && (
          <div className="p-5 overflow-y-auto flex flex-col gap-4">
            {installSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>App successfully verified and added to Loom launcher!</span>
              </div>
            )}

            {/* URL Option */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-300">
                Option A: Paste Manifest URL (HTTPS only)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  placeholder="https://example.com/loom-app.json"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleFetchManifestUrl}
                  disabled={isFetchingUrl}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
                >
                  {isFetchingUrl ? 'Fetching...' : 'Fetch & Inspect'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] uppercase tracking-wider text-zinc-500">Or Raw JSON</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Raw JSON Option */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300">
                  Option B: Paste JSON Manifest Schema
                </label>
                <div className="flex gap-2 text-[10px]">
                  <button 
                    onClick={() => loadPreset('sample')} 
                    className="text-indigo-400 hover:underline"
                  >
                    Load Sample Manifest
                  </button>
                  <span className="text-zinc-600">|</span>
                  <button 
                    onClick={() => loadPreset('malformed')} 
                    className="text-amber-400 hover:underline"
                  >
                    Test Malformed/Unsafe Rejection
                  </button>
                </div>
              </div>

              <textarea
                rows={6}
                value={manifestInput}
                onChange={e => setManifestInput(e.target.value)}
                placeholder='{\n  "id": "my.app",\n  "name": "My App",\n  "version": "1.0.0",\n  "url": "https://example.com",\n  "permissions": ["storage:read"]\n}'
                className="w-full bg-[#090b10] border border-white/10 rounded-lg p-3 font-mono text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-indigo-500 resize-none"
              />

              <button
                onClick={handleInspectRawJson}
                className="self-end px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-medium transition-colors"
              >
                Inspect Manifest Schema
              </button>
            </div>

            {/* Validation Errors Box */}
            {validationErrors.length > 0 && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-red-400 text-xs font-semibold">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Manifest Security Validation Failed</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-red-300/90 space-y-0.5">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pending Manifest Approval Card */}
            {pendingManifest && (
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-semibold text-indigo-300">
                      Manifest Validated — Capability Approval Required
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    ID: {pendingManifest.id}
                  </span>
                </div>

                <div className="text-xs text-zinc-300">
                  <strong>{pendingManifest.name}</strong> (v{pendingManifest.version})
                  <p className="text-[11px] text-zinc-400 mt-0.5">{pendingManifest.description}</p>
                  <p className="text-[10.5px] font-mono text-zinc-500 mt-1">Origin URL: {pendingManifest.url}</p>
                </div>

                {/* Permissions Warning & Grant */}
                <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                  <span className="text-[11px] font-semibold text-amber-300 flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle className="w-3 h-3" />
                    Requested Capabilities:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {pendingManifest.permissions.length === 0 ? (
                      <span className="text-[10px] text-zinc-400 italic">No permissions requested (Zero capability sandbox)</span>
                    ) : (
                      pendingManifest.permissions.map(perm => (
                        <span key={perm} className="text-[10px] font-mono bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded border border-amber-500/30">
                          {perm}
                        </span>
                      ))
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-2">
                    Third-party apps run in a sandboxed iframe without host DOM access. Loom will only grant the capabilities selected above.
                  </p>
                </div>

                <div className="flex justify-end gap-2 mt-1">
                  <button
                    onClick={() => setPendingManifest(null)}
                    className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApproveAndInstall}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-lg shadow-indigo-600/30"
                  >
                    Approve Capabilities & Install
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
