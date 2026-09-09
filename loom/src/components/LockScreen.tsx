import React, { useState, useEffect } from 'react';
import type { UserProfile } from '../types/auth';
import { verifyPassphrase, createGuestProfile } from '../services/auth';
import { Unlock, User, Shield, ArrowRight } from 'lucide-react';

interface LockScreenProps {
  isLocked: boolean;
  profiles: UserProfile[];
  activeProfile: UserProfile | null;
  onUnlock: (profile: UserProfile) => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  isLocked,
  profiles,
  activeProfile,
  onUnlock
}) => {
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(activeProfile);
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState(false);
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    if (activeProfile) setSelectedProfile(activeProfile);
  }, [activeProfile]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDateStr(now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isLocked) return null;

  const handleUnlockAttempt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedProfile) return;

    if (!selectedProfile.passwordHash) {
      // No password required
      onUnlock(selectedProfile);
      setPassphrase('');
      setError(false);
      return;
    }

    const isValid = await verifyPassphrase(passphrase, selectedProfile.passwordHash);
    if (isValid) {
      onUnlock(selectedProfile);
      setPassphrase('');
      setError(false);
    } else {
      setError(true);
      setPassphrase('');
    }
  };

  const handleGuestLogin = async () => {
    const guest = await createGuestProfile();
    onUnlock(guest);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#07080d] flex flex-col items-center justify-between p-10 select-none backdrop-blur-3xl animate-in fade-in duration-300">
      {/* Ambient background glow */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(circle at 50% 35%, rgba(99, 102, 241, 0.25) 0%, transparent 65%)'
        }}
      />

      {/* Top Clock */}
      <div className="flex flex-col items-center gap-1 mt-6 z-10">
        <span className="text-6xl font-light tracking-tight text-zinc-100 font-sans">
          {timeStr}
        </span>
        <span className="text-sm font-medium text-zinc-400">
          {dateStr}
        </span>
      </div>

      {/* Center Auth Card */}
      <div className="w-full max-w-sm flex flex-col items-center gap-5 z-10">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/30 ring-4 ring-white/10">
          <User className="w-8 h-8" />
        </div>

        {/* Profile Name */}
        <div className="text-center">
          <h2 className="text-base font-semibold text-zinc-100">
            {selectedProfile?.displayName || 'Loom Operator'}
          </h2>
          <span className="text-xs text-zinc-500 font-mono">
            @{selectedProfile?.username || 'user'}
          </span>
        </div>

        {/* Passphrase Form */}
        <form onSubmit={handleUnlockAttempt} className="w-full flex flex-col gap-3">
          {selectedProfile?.passwordHash ? (
            <div className="relative w-full">
              <input
                type="password"
                value={passphrase}
                onChange={e => {
                  setPassphrase(e.target.value);
                  setError(false);
                }}
                placeholder="Enter Passphrase"
                autoFocus
                className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all ${
                  error ? 'border-red-500 ring-2 ring-red-500/30' : 'border-white/15 focus:border-indigo-500'
                }`}
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleUnlockAttempt()}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Loom</span>
            </button>
          )}

          {error && (
            <span className="text-xs text-red-400 text-center animate-bounce">
              Incorrect passphrase. Try again.
            </span>
          )}
        </form>

        {/* Profile Switcher & Guest Mode */}
        <div className="flex items-center gap-3 text-xs text-zinc-400 pt-2">
          {profiles.length > 1 && (
            <select
              value={selectedProfile?.id}
              onChange={e => {
                const found = profiles.find(p => p.id === e.target.value);
                if (found) setSelectedProfile(found);
              }}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-zinc-300 outline-none"
            >
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.displayName}</option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleGuestLogin}
            className="hover:text-zinc-200 underline"
          >
            Enter as Guest
          </button>
        </div>
      </div>

      {/* Bottom Footer Info */}
      <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono z-10">
        <Shield className="w-3.5 h-3.5 text-emerald-400" />
        <span>Loom Secure Client-Side Encryption (SHA-256)</span>
      </div>
    </div>
  );
};
