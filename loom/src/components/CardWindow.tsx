import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { CardInstance } from '../types/card';
import type { InstalledApp } from '../types/manifest';
import { 
  Minus, 
  X, 
  Maximize2, 
  Minimize2, 
  ShieldCheck, 
  FileText,
  Clipboard,
  CheckSquare,
  ShieldAlert,
  Layers,
  Calculator,
  Clock,
  Code,
  Calendar,
  Image as ImageIcon,
  PlayCircle,
  CloudSun,
  Cpu
} from 'lucide-react';

interface CardWindowProps {
  card: CardInstance;
  app: InstalledApp | undefined;
  isActive?: boolean;
  onUpdate: (updates: Partial<CardInstance>) => void;
  onClose: () => void;
  onFocus: () => void;
}

const SNAP_GRID = 16;
const SNAP_THRESHOLD = 24;

export const CardWindow: React.FC<CardWindowProps> = ({
  card,
  app,
  isActive = false,
  onUpdate,
  onClose,
  onFocus
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isUnresponsive, setIsUnresponsive] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; cardX: number; cardY: number }>({
    mouseX: 0,
    mouseY: 0,
    cardX: card.x,
    cardY: card.y
  });
  const resizeStartRef = useRef<{ mouseX: number; mouseY: number; width: number; height: number }>({
    mouseX: 0,
    mouseY: 0,
    width: card.width,
    height: card.height
  });

  // Render icon based on app icon string
  const renderAppIcon = () => {
    const iconName = app?.icon || 'FileText';
    const props = { className: "w-3.5 h-3.5" };
    switch (iconName) {
      case 'Clipboard': return <Clipboard {...props} className="w-3.5 h-3.5 text-emerald-400" />;
      case 'CheckSquare': return <CheckSquare {...props} className="w-3.5 h-3.5 text-amber-400" />;
      case 'ShieldAlert': return <ShieldAlert {...props} className="w-3.5 h-3.5 text-sky-400" />;
      case 'Calculator': return <Calculator {...props} className="w-3.5 h-3.5 text-indigo-400" />;
      case 'Clock': return <Clock {...props} className="w-3.5 h-3.5 text-amber-400" />;
      case 'Code': return <Code {...props} className="w-3.5 h-3.5 text-cyan-400" />;
      case 'Calendar': return <Calendar {...props} className="w-3.5 h-3.5 text-pink-400" />;
      case 'Image': return <ImageIcon {...props} className="w-3.5 h-3.5 text-purple-400" />;
      case 'PlayCircle': return <PlayCircle {...props} className="w-3.5 h-3.5 text-emerald-400" />;
      case 'CloudSun': return <CloudSun {...props} className="w-3.5 h-3.5 text-sky-400" />;
      case 'Cpu': return <Cpu {...props} className="w-3.5 h-3.5 text-violet-400" />;
      case 'Layers': return <Layers {...props} className="w-3.5 h-3.5 text-indigo-400" />;
      default: return <FileText {...props} className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  // Drag handling with grid and viewport edge snapping
  const handleMouseDownDrag = (e: React.MouseEvent) => {
    if (card.isMaximized) return;
    e.stopPropagation();
    onFocus();

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      cardX: card.x,
      cardY: card.y
    };
    setIsDragging(true);
  };

  // Resize handling
  const handleMouseDownResize = (e: React.MouseEvent) => {
    if (card.isMaximized) return;
    e.stopPropagation();
    onFocus();

    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: card.width,
      height: card.height
    };
    setIsResizing(true);
  };

  const handlePointerMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStartRef.current.mouseX;
      const deltaY = e.clientY - dragStartRef.current.mouseY;

      let rawX = dragStartRef.current.cardX + deltaX;
      let rawY = dragStartRef.current.cardY + deltaY;

      // Snap to grid
      let snappedX = Math.round(rawX / SNAP_GRID) * SNAP_GRID;
      let snappedY = Math.round(rawY / SNAP_GRID) * SNAP_GRID;

      // Snap to screen edge bounds
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      if (Math.abs(snappedX - 20) < SNAP_THRESHOLD) snappedX = 20;
      if (Math.abs(snappedX + card.width - (screenWidth - 20)) < SNAP_THRESHOLD) {
        snappedX = screenWidth - 20 - card.width;
      }
      if (Math.abs(snappedY - 60) < SNAP_THRESHOLD) snappedY = 60; // top bar clearance
      if (Math.abs(snappedY + card.height - (screenHeight - 20)) < SNAP_THRESHOLD) {
        snappedY = screenHeight - 20 - card.height;
      }

      onUpdate({ x: Math.max(10, snappedX), y: Math.max(50, snappedY) });
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStartRef.current.mouseX;
      const deltaY = e.clientY - resizeStartRef.current.mouseY;

      let newWidth = Math.max(340, resizeStartRef.current.width + deltaX);
      let newHeight = Math.max(260, resizeStartRef.current.height + deltaY);

      // Snap resizing to grid
      newWidth = Math.round(newWidth / SNAP_GRID) * SNAP_GRID;
      newHeight = Math.round(newHeight / SNAP_GRID) * SNAP_GRID;

      onUpdate({ width: newWidth, height: newHeight });
    }
  }, [isDragging, isResizing, card.width, card.height, onUpdate]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };
  }, [isDragging, isResizing, handlePointerMove, handlePointerUp]);

  if (card.isMinimized) return null;

  const style: React.CSSProperties = card.isMaximized ? {
    position: 'absolute',
    top: 54,
    left: 16,
    right: 16,
    bottom: 16,
    zIndex: card.zIndex,
    width: 'calc(100vw - 32px)',
    height: 'calc(100vh - 70px)'
  } : {
    position: 'absolute',
    top: card.y,
    left: card.x,
    width: card.width,
    height: card.height,
    zIndex: card.zIndex
  };

  // Build sandboxed iframe URL with capability token and app ID
  const iframeSrc = `${card.appId.startsWith('loom.') ? (app?.url || '/apps/notes.html') : app?.url}?token=${card.sessionToken}&appId=${card.appId}`;

  return (
    <div
      onMouseDown={onFocus}
      style={{
        ...style,
        borderRadius: 'var(--loom-window-radius, 16px)',
        backdropFilter: 'blur(var(--loom-window-blur, 16px))',
        WebkitBackdropFilter: 'blur(var(--loom-window-blur, 16px))',
        opacity: 'var(--loom-window-opacity, 0.95)',
        transitionDuration: 'var(--loom-anim-speed, 200ms)',
        borderColor: isActive ? 'var(--loom-accent, #6366f1)' : undefined,
        boxShadow: isActive ? '0 0 0 1px var(--loom-accent, #6366f1), 0 20px 25px -5px rgba(0, 0, 0, 0.5)' : undefined
      }}
      className={`group flex flex-col bg-[#0e1017]/95 border shadow-2xl transition-all overflow-hidden ${
        isActive 
          ? '' 
          : 'border-white/10 hover:border-white/20'
      } ${
        isDragging ? 'ring-1 cursor-grabbing' : ''
      }`}
    >
      {/* Unresponsive App Warning Banner */}
      {isUnresponsive && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 px-3 py-1 flex items-center justify-between text-[11px] text-amber-300">
          <span>App is taking longer than expected to respond.</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setIsUnresponsive(false)}
              className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200"
            >
              Wait
            </button>
            <button
              onClick={onClose}
              className="px-2 py-0.5 rounded bg-red-500/30 hover:bg-red-500/40 text-red-200 font-semibold"
            >
              Force Quit
            </button>
          </div>
        </div>
      )}

      {/* Minimal Header */}
      <div
        onMouseDown={handleMouseDownDrag}
        className="flex items-center justify-between px-3.5 py-2.5 bg-white/[0.03] border-b border-white/5 select-none cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="p-1 rounded-md bg-white/[0.06] flex items-center justify-center">
            {renderAppIcon()}
          </div>
          <span className="text-xs font-medium text-zinc-200 tracking-wide truncate max-w-[140px]">
            {card.title}
          </span>
          <div className="hidden sm:flex items-center gap-1 text-[10px] text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/5">
            <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
            <span>sandboxed</span>
          </div>
        </div>

        {/* Card Window Action Controls */}
        <div className="flex items-center gap-1">
          <button
            title="Minimize"
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({ isMinimized: true });
            }}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/10 transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            title={card.isMaximized ? "Restore" : "Maximize"}
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({ isMaximized: !card.isMaximized });
            }}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/10 transition-colors"
          >
            {card.isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            title="Close Card"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 rounded-md text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* App Body Container */}
      <div className="relative flex-1 w-full bg-[#0a0c12] overflow-hidden">
        {/* Transparent drag blocker overlay: keeps iframe from eating pointer events while dragging/resizing */}
        {(isDragging || isResizing) && (
          <div className="absolute inset-0 z-50 bg-transparent cursor-grabbing" />
        )}

        {/* Sandboxed iframe: STRICT sandbox="allow-scripts allow-forms" - NO allow-same-origin! */}
        <iframe
          src={iframeSrc}
          sandbox="allow-scripts allow-forms"
          title={card.title}
          className="w-full h-full border-none"
        />
      </div>

      {/* Resizing Handle Corner (only when not maximized) */}
      {!card.isMaximized && (
        <div
          onMouseDown={handleMouseDownResize}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 z-30"
        >
          <div className="w-2 h-2 border-r-2 border-b-2 border-white/20 rounded-br-sm group-hover:border-white/40 transition-colors" />
        </div>
      )}
    </div>
  );
};
