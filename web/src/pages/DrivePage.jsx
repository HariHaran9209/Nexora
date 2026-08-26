// web/src/pages/DrivePage.jsx
import React, { useState } from 'react';
import { 
  LayoutGrid, 
  List, 
  Plus, 
  FolderPlus, 
  Upload, 
  Music, 
  Film, 
  Image as ImageIcon, 
  FileText, 
  Sparkles,
  HardDrive
} from 'lucide-react';
import { useDrive } from '../context/DriveContext';
import { Breadcrumbs } from '../components/drive/Breadcrumbs';
import { FileGrid } from '../components/drive/FileGrid';
import { FileList } from '../components/drive/FileList';
import { UploadQueueModal } from '../components/drive/UploadQueueModal';
import { Modal } from '../components/common/Modal';

export const DrivePage = () => {
  const {
    viewMode,
    toggleViewMode,
    activeCategory,
    setActiveCategory,
    createFolder,
    renameItem,
    deleteItem,
    fetchFiles,
    enqueueUploads
  } = useDrive();

  // Modals state
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameTarget, setRenameTarget] = useState(null); // { item, isFolder }
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, isFolder }

  // Drag & drop highlight state
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const categories = [
    { id: null, label: 'All Files', icon: HardDrive },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'video', label: 'Videos', icon: Film },
    { id: 'image', label: 'Photos', icon: ImageIcon },
    { id: 'document', label: 'Documents', icon: FileText }
  ];

  const handleCategoryClick = (catId) => {
    setActiveCategory(catId);
    fetchFiles({ category: catId, folderId: catId ? null : 'root' });
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      await createFolder(newFolderName.trim());
      setNewFolderName('');
      setIsNewFolderOpen(false);
    }
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (renameTarget && renameValue.trim()) {
      await renameItem(renameTarget.item._id, renameValue.trim(), renameTarget.isFolder);
      setRenameTarget(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteItem(deleteTarget.id, deleteTarget.isFolder, false);
      setDeleteTarget(null);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      enqueueUploads(e.dataTransfer.files);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex-1 flex flex-col h-full overflow-hidden p-6 select-none"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-4 z-50 rounded-3xl border-2 border-dashed border-emerald-400 bg-emerald-950/80 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none animate-in fade-in zoom-in-95">
          <Upload className="w-16 h-16 text-emerald-400 animate-bounce mb-3" />
          <h3 className="text-xl font-bold text-white">Drop files to upload</h3>
          <p className="text-sm text-emerald-300">Files will be streamed straight to your 500GB HDD</p>
        </div>
      )}

      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5 shrink-0">
        {/* Breadcrumbs */}
        <Breadcrumbs />

        {/* Category Pills & View Switcher */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-[#18181b] p-1 rounded-xl border border-white/5">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id || 'all'}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-500 text-black shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Grid / List View Toggle */}
          <div className="flex items-center bg-[#18181b] p-1 rounded-xl border border-white/5">
            <button
              onClick={() => toggleViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Files View Container */}
      <div className="flex-1 overflow-y-auto pr-1">
        {viewMode === 'grid' ? (
          <FileGrid
            onRename={(item, isFolder) => {
              setRenameTarget({ item, isFolder });
              setRenameValue(item.name);
            }}
            onDelete={(id, isFolder) => setDeleteTarget({ id, isFolder })}
          />
        ) : (
          <FileList
            onRename={(item, isFolder) => {
              setRenameTarget({ item, isFolder });
              setRenameValue(item.name);
            }}
            onDelete={(id, isFolder) => setDeleteTarget({ id, isFolder })}
          />
        )}
      </div>

      {/* Floating Upload Progress Queue Panel */}
      <UploadQueueModal />

      {/* New Folder Modal */}
      <Modal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        title="Create New Folder"
      >
        <form onSubmit={handleCreateFolder} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-400 mb-1 block">Folder Name</label>
            <input
              type="text"
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. Music, Camera Backups, Projects"
              className="w-full bg-[#121214] border border-white/10 focus:border-emerald-500 px-4 py-2.5 rounded-xl text-sm text-white outline-none"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsNewFolderOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newFolderName.trim()}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Create Folder
            </button>
          </div>
        </form>
      </Modal>

      {/* Rename Modal */}
      <Modal
        isOpen={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        title={`Rename ${renameTarget?.isFolder ? 'Folder' : 'File'}`}
      >
        <form onSubmit={handleRenameSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-400 mb-1 block">New Name</label>
            <input
              type="text"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full bg-[#121214] border border-white/10 focus:border-emerald-500 px-4 py-2.5 rounded-xl text-sm text-white outline-none"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setRenameTarget(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!renameValue.trim()}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Move to Trash"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-zinc-300">
            Are you sure you want to delete this {deleteTarget?.isFolder ? 'folder and its contents' : 'file'}?
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-5 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
