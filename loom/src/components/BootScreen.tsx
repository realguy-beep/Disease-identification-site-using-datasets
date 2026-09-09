import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface BootScreenProps {
  onComplete: () => void;
}

export const BootScreen: React.FC<BootScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('Initializing Sandboxed Kernel...');

  useEffect(() => {
    const t1 = setTimeout(() => {
      setProgress(45);
      setStatusText('Mounting Virtual File System & Dexie DB...');
    }, 600);

    const t2 = setTimeout(() => {
      setProgress(85);
      setStatusText('Verifying RPC Capability Boundaries...');
    }, 1300);

    const t3 = setTimeout(() => {
      setProgress(100);
      setStatusText('Loom OS Ready');
    }, 1900);

    const t4 = setTimeout(() => {
      onComplete();
    }, 2400);

    const handleSkip = () => {
      onComplete();
    };

    window.addEventListener('keydown', handleSkip);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener('keydown', handleSkip);
    };
  }, [onComplete]);

  return (
    <div 
      onClick={onComplete}
      className="fixed inset-0 z-50 bg-[#06070b] flex flex-col items-center justify-center select-none cursor-pointer"
    >
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 45%, rgba(99, 102, 241, 0.25) 0%, transparent 60%)'
        }}
      />

      <div className="flex flex-col items-center gap-6 z-10">
        {/* Animated Brand Logo */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 flex items-center justify-center shadow-2xl shadow-indigo-500/40 ring-4 ring-white/10 animate-pulse">
            <span className="text-2xl font-black text-white tracking-tighter">L</span>
          </div>
          <Sparkles className="w-5 h-5 text-amber-400 absolute -top-2 -right-2 animate-bounce" />
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-wider text-zinc-100 uppercase">
            Loom OS
          </h1>
          <span className="text-[11px] font-mono text-zinc-500 tracking-widest">
            VERSION 2.0 • ADAPTIVE CONTEXT SURFACE
          </span>
        </div>

        {/* Boot Progress Track */}
        <div className="flex flex-col items-center gap-2 w-64 mt-2">
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            {statusText}
          </span>
        </div>

        {/* Skip hint */}
        <span className="text-[10px] text-zinc-600 font-mono mt-8">
          Press any key or click to skip
        </span>
      </div>
    </div>
  );
};
