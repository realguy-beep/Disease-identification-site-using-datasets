import React, { useState } from 'react';
import type { StateItem, StateItemType } from '../types/state';
import { sanitizeHTML } from '../services/security';
import { 
  X, 
  Database, 
  FileText, 
  CheckSquare, 
  Link as LinkIcon, 
  Code, 
  Plus, 
  Trash2, 
  Search, 
  Download, 
  Upload, 
  Hash, 
  ChevronRight
} from 'lucide-react';

interface UniversalStateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stateItems: StateItem[];
  selectedItem: StateItem | null;
  onSelectItem: (item: StateItem | null) => void;
  onSaveItem: (item: Partial<StateItem> & { id?: string }) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onExportBackup: () => void;
  onImportBackup: (items: StateItem[]) => Promise<void>;
}

export const UniversalStateDrawer: React.FC<UniversalStateDrawerProps> = ({
  isOpen,
  onClose,
  stateItems,
  selectedItem,
  onSelectItem,
  onSaveItem,
  onDeleteItem,
  onExportBackup,
  onImportBackup
}) => {
  const [filterType, setFilterType] = useState<StateItemType | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Edit form states
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState<StateItemType>('note');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editLinks, setEditLinks] = useState('');

  if (!isOpen) return null;

  // Extract all unique tags
  const allTags = Array.from(
    new Set(stateItems.flatMap(item => item.tags || []))
  ).filter(Boolean);

  // Filter items
  const filteredItems = stateItems.filter(item => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (selectedTag && (!item.tags || !item.tags.includes(selectedTag))) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleStartCreate = () => {
    setEditTitle('');
    setEditType('note');
    setEditContent('');
    setEditTags('');
    setEditLinks('');
    onSelectItem(null);
    setIsEditing(true);
  };

  const handleStartEdit = (item: StateItem) => {
    onSelectItem(item);
    setEditTitle(item.title);
    setEditType(item.type);
    setEditContent(item.content);
    setEditTags((item.tags || []).join(', '));
    setEditLinks((item.links || []).join(', '));
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editTitle.trim()) return;

    const tagsArray = editTags
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const linksArray = editLinks
      .split(',')
      .map(l => l.trim())
      .filter(Boolean);

    await onSaveItem({
      id: selectedItem ? selectedItem.id : undefined,
      title: editTitle.trim(),
      type: editType,
      content: editContent,
      tags: tagsArray,
      links: linksArray
    });

    setIsEditing(false);
  };

  const renderIcon = (type: StateItemType) => {
    switch (type) {
      case 'note': return <FileText className="w-3.5 h-3.5 text-indigo-400" />;
      case 'task': return <CheckSquare className="w-3.5 h-3.5 text-amber-400" />;
      case 'link': return <LinkIcon className="w-3.5 h-3.5 text-sky-400" />;
      case 'snippet': return <Code className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          await onImportBackup(json);
        }
      } catch (err) {
        alert('Invalid JSON backup file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-[#0e1017] border-l border-white/10 shadow-2xl flex flex-col backdrop-blur-2xl select-none">
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-zinc-100">Universal State Store</h2>
          <span className="text-[10px] bg-white/5 text-zinc-400 px-1.5 py-0.5 rounded border border-white/5">
            IndexedDB
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExportBackup}
            title="Export State Backup"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <label
            title="Import State Backup"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <input type="file" accept=".json" onChange={handleFileInput} className="hidden" />
          </label>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3 border-b border-white/5 flex flex-col gap-2">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
          <Search className="w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search state items by keyword or tag..."
            className="flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-500 outline-none"
          />
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 text-[11px]">
            {(['all', 'note', 'task', 'link', 'snippet'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2 py-0.5 rounded-md capitalize transition-colors ${
                  filterType === t 
                    ? 'bg-indigo-600 text-white font-medium' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={handleStartCreate}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>New Item</span>
          </button>
        </div>

        {/* Tags bar */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto py-1 no-scrollbar">
            <span className="text-[10px] text-zinc-500 flex items-center gap-0.5">
              <Hash className="w-2.5 h-2.5" /> Tags:
            </span>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`text-[10px] px-1.5 py-0.5 rounded-md transition-colors whitespace-nowrap ${
                  selectedTag === tag 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                    : 'bg-white/5 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {/* If creating/editing */}
        {isEditing ? (
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">
                {selectedItem ? 'Edit State Item' : 'New State Item'}
              </span>
              <select
                value={editType}
                onChange={e => setEditType(e.target.value as StateItemType)}
                className="bg-[#12141e] border border-white/10 text-zinc-300 text-xs rounded px-2 py-1 outline-none"
              >
                <option value="note">Note</option>
                <option value="task">Task</option>
                <option value="link">Link</option>
                <option value="snippet">Snippet</option>
              </select>
            </div>

            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              placeholder="Title..."
              className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-indigo-500"
            />

            <textarea
              rows={5}
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              placeholder="Content / markdown notes / URL / code..."
              className="bg-white/5 border border-white/10 rounded-lg p-2.5 font-mono text-xs text-zinc-200 outline-none focus:border-indigo-500 resize-none"
            />

            <input
              type="text"
              value={editTags}
              onChange={e => setEditTags(e.target.value)}
              placeholder="Tags (comma separated, e.g. loom, project, security)"
              className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 outline-none"
            />

            <input
              type="text"
              value={editLinks}
              onChange={e => setEditLinks(e.target.value)}
              placeholder="Cross-links (item IDs separated by comma)"
              className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 outline-none"
            />

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
              >
                Save Item
              </button>
            </div>
          </div>
        ) : null}

        {/* State Item Cards */}
        {filteredItems.map(item => (
          <div
            key={item.id}
            onClick={() => handleStartEdit(item)}
            className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/15 transition-all cursor-pointer flex flex-col gap-1.5 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-white/5">
                  {renderIcon(item.type)}
                </div>
                <h4 className="text-xs font-medium text-zinc-200 group-hover:text-indigo-300 transition-colors">
                  {item.title}
                </h4>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  title="Delete Item"
                  onClick={e => {
                    e.stopPropagation();
                    onDeleteItem(item.id);
                  }}
                  className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div 
              className="text-[11.5px] text-zinc-400 line-clamp-2 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(item.content) }}
            />

            {/* Tags and Cross-Links */}
            <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-500">
              <div className="flex flex-wrap gap-1">
                {item.tags?.map(t => (
                  <span key={t} className="bg-white/5 text-zinc-400 px-1 rounded">
                    #{t}
                  </span>
                ))}
              </div>

              {item.links && item.links.length > 0 && (
                <span className="text-indigo-400 flex items-center gap-0.5">
                  <ChevronRight className="w-2.5 h-2.5" />
                  {item.links.length} linked
                </span>
              )}
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && !isEditing && (
          <div className="py-12 text-center text-xs text-zinc-500">
            No state items found matching filters.
          </div>
        )}
      </div>
    </div>
  );
};
