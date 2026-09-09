import React, { useState } from 'react';
import { Clipboard, Search, Copy, Check, Trash2, X } from 'lucide-react';

interface ClipboardItem {
  id: string;
  text: string;
  timestamp: number;
}

interface ClipboardManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ClipboardItem[];
  onCopyItem: (text: string) => void;
  onDeleteItem: (id: string) => void;
  onAddItem: (text: string) => void;
}

export const ClipboardManagerModal: React.FC<ClipboardManagerModalProps> = ({
  isOpen,
  onClose,
  history,
  onCopyItem,
  onDeleteItem,
  onAddItem
}) => {
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newText, setNewText] = useState('');

  if (!isOpen) return null;

  const filteredHistory = history.filter(item => 
    !search || item.text.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopy = (item: ClipboardItem) => {
    onCopyItem(item.text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleAdd = () => {
    if (!newText.trim()) return;
    onAddItem(newText.trim());
    setNewText('');
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg rounded-2xl bg-[#0f111a] border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[75vh] backdrop-blur-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded bg-emerald-500/20 text-emerald-400">
              <Clipboard className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-zinc-100">OS Clipboard History</h3>
            <span className="text-[10px] bg-white/5 text-zinc-400 px-1.5 py-0.5 rounded font-mono">
              ⌘⇧V
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Add */}
        <div className="p-3 border-b border-white/5 flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search clipboard history..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-xs text-zinc-200 placeholder-zinc-500 outline-none flex-1"
            />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add new snippet to clipboard..."
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-zinc-200 outline-none flex-1"
            />
            <button
              onClick={handleAdd}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium"
            >
              Add
            </button>
          </div>
        </div>

        {/* Snippet List */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {filteredHistory.map(item => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 flex items-start justify-between gap-3 group transition-all"
            >
              <div className="flex flex-col gap-1 overflow-hidden flex-1">
                <span className="font-mono text-xs text-zinc-200 break-all line-clamp-3">
                  {item.text}
                </span>
                <span className="text-[9.5px] text-zinc-500 font-mono">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleCopy(item)}
                  className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors ${
                    copiedId === item.id 
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                      : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white'
                  }`}
                  title="Copy to Clipboard"
                >
                  {copiedId === item.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => onDeleteItem(item.id)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {filteredHistory.length === 0 && (
            <div className="py-12 text-center text-xs text-zinc-500">
              Clipboard history is empty.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
