import React, { useState, useEffect } from 'react';
import type { VFSNode } from '../types/vfs';
import { getDirectoryContents, importRealFile } from '../services/vfs';
import { Folder, FileText, ArrowLeft, Upload, X, Check, Search } from 'lucide-react';

interface FilePickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (node: VFSNode) => void;
  title?: string;
  allowedMimeTypes?: string[];
}

export const FilePickerDialog: React.FC<FilePickerDialogProps> = ({
  isOpen,
  onClose,
  onSelectFile,
  title = 'Select a File from Loom Virtual Storage',
  allowedMimeTypes
}) => {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<Array<{ id: string | null; name: string }>>([
    { id: null, name: 'Root' }
  ]);
  const [nodes, setNodes] = useState<VFSNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadContents(currentFolderId);
    }
  }, [isOpen, currentFolderId]);

  const loadContents = async (parentId: string | null) => {
    const items = await getDirectoryContents(parentId);
    setNodes(items);
  };

  if (!isOpen) return null;

  const handleNavigateDown = (folder: VFSNode) => {
    setCurrentFolderId(folder.id);
    setFolderHistory(prev => [...prev, { id: folder.id, name: folder.name }]);
    setSelectedNodeId(null);
  };

  const handleNavigateUp = () => {
    if (folderHistory.length <= 1) return;
    const newHistory = folderHistory.slice(0, -1);
    const prevFolder = newHistory[newHistory.length - 1];
    setFolderHistory(newHistory);
    setCurrentFolderId(prevFolder.id);
    setSelectedNodeId(null);
  };

  const handleUploadFromHost = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importRealFile(file, currentFolderId);
    await loadContents(currentFolderId);
  };

  const filteredNodes = nodes.filter(n => {
    if (search && !n.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (allowedMimeTypes && n.type === 'file' && n.mimeType) {
      return allowedMimeTypes.some(m => n.mimeType?.includes(m));
    }
    return true;
  });

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl rounded-2xl bg-[#0f111a] border border-white/15 shadow-2xl overflow-hidden flex flex-col backdrop-blur-2xl max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded bg-blue-500/20 text-blue-400">
              <Folder className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-zinc-100">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Path Nav & Search */}
        <div className="px-4 py-2 bg-white/[0.02] border-b border-white/5 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 overflow-hidden text-zinc-400">
            {folderHistory.length > 1 && (
              <button onClick={handleNavigateUp} className="p-1 hover:text-zinc-200">
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="font-mono text-zinc-300">
              {folderHistory.map(f => f.name).join(' / ')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded border border-white/10">
              <Search className="w-3 h-3 text-zinc-400" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-[11px] text-zinc-200 outline-none w-24"
              />
            </div>

            <label className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-300 text-[11px] cursor-pointer">
              <Upload className="w-3 h-3" />
              <span>Upload File</span>
              <input type="file" onChange={handleUploadFromHost} className="hidden" />
            </label>
          </div>
        </div>

        {/* File List Grid */}
        <div className="p-4 overflow-y-auto max-h-72 grid grid-cols-3 gap-2.5">
          {filteredNodes.map(node => {
            const isSelected = selectedNodeId === node.id;
            return (
              <button
                key={node.id}
                onClick={() => {
                  if (node.type === 'folder') {
                    handleNavigateDown(node);
                  } else {
                    setSelectedNodeId(node.id);
                  }
                }}
                className={`p-2.5 rounded-xl border flex flex-col items-center text-center gap-1.5 transition-all ${
                  isSelected 
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-lg shadow-indigo-500/10' 
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] text-zinc-300'
                }`}
              >
                {node.type === 'folder' ? (
                  <Folder className="w-8 h-8 text-blue-400" />
                ) : (
                  <FileText className="w-8 h-8 text-zinc-400" />
                )}
                <span className="text-[11px] font-medium truncate w-full">{node.name}</span>
                {node.type === 'file' && (
                  <span className="text-[9px] text-zinc-500">{(node.size / 1024).toFixed(1)} KB</span>
                )}
              </button>
            );
          })}

          {filteredNodes.length === 0 && (
            <div className="col-span-3 py-10 text-center text-xs text-zinc-500">
              No files found in this folder.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between bg-white/[0.02]">
          <span className="text-[11px] text-zinc-400">
            {selectedNode ? `Selected: ${selectedNode.name}` : 'Select a file to continue'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              disabled={!selectedNode}
              onClick={() => {
                if (selectedNode) {
                  onSelectFile(selectedNode);
                  onClose();
                }
              }}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Select File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

