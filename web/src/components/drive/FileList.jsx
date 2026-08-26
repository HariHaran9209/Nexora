// web/src/components/drive/FileList.jsx
import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  Folder, 
  Music, 
  Film, 
  Image as ImageIcon, 
  FileText, 
  Archive, 
  File, 
  Heart, 
  Download, 
  Trash2, 
  Edit2, 
  Clock 
} from 'lucide-react';
import { useDrive } from '../../context/DriveContext';
import { usePlayer } from '../../context/PlayerContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export const FileList = ({ onRename, onMove, onDelete }) => {
  const { folders, files, setCurrentFolderId, fetchFiles, toggleFavorite } = useDrive();
  const { playTrack } = usePlayer();
  const navigate = useNavigate();
  const parentRef = useRef(null);

  // Combine folders and files for a single unified virtualized list
  const allItems = [
    ...folders.map((f) => ({ ...f, isFolderItem: true })),
    ...files.map((f) => ({ ...f, isFolderItem: false }))
  ];

  const rowVirtualizer = useVirtualizer({
    count: allItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 10
  });

  const handleOpenFolder = (folderId) => {
    setCurrentFolderId(folderId);
    fetchFiles({ folderId });
  };

  const handleFileClick = (file) => {
    if (file.category === 'audio') {
      const audioFiles = files.filter((f) => f.category === 'audio');
      playTrack(file, audioFiles);
    } else if (file.category === 'video') {
      navigate(`/video?play=${file._id}`);
    } else {
      const token = localStorage.getItem('nexora_token');
      window.open(`/api/stream/file/${file._id}?token=${token}`, '_blank');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '--';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderIcon = (item) => {
    if (item.isFolderItem) {
      return <Folder className="w-5 h-5 text-amber-400 fill-amber-400/20 shrink-0" />;
    }
    if (item.category === 'audio') return <Music className="w-5 h-5 text-emerald-400 shrink-0" />;
    if (item.category === 'video') return <Film className="w-5 h-5 text-amber-400 shrink-0" />;
    if (item.category === 'image') return <ImageIcon className="w-5 h-5 text-teal-400 shrink-0" />;
    if (item.category === 'document') return <FileText className="w-5 h-5 text-blue-400 shrink-0" />;
    if (item.category === 'archive') return <Archive className="w-5 h-5 text-purple-400 shrink-0" />;
    return <File className="w-5 h-5 text-zinc-400 shrink-0" />;
  };

  if (allItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-500 mb-4">
          <Folder className="w-8 h-8" />
        </div>
        <h4 className="text-base font-semibold text-white mb-1">This folder is empty</h4>
        <p className="text-sm text-zinc-400 max-w-sm">
          Drag and drop files here or click the Upload button to start.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full select-none">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-white/5">
        <div className="col-span-6 flex items-center gap-2">Name</div>
        <div className="col-span-2">Size</div>
        <div className="col-span-3">Modified</div>
        <div className="col-span-1 text-right">Actions</div>
      </div>

      {/* Virtualized Container (60fps/120fps Hardware Accelerated) */}
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto gpu-layer will-change-transform"
        style={{ height: 'calc(100vh - 230px)' }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = allItems[virtualRow.index];
            const isFolder = item.isFolderItem;

            return (
              <div
                key={item._id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`
                }}
                onClick={() => (isFolder ? handleOpenFolder(item._id) : handleFileClick(item))}
                className="grid grid-cols-12 gap-4 px-4 py-2 items-center rounded-lg hover:bg-white/5 transition-colors cursor-pointer group text-sm border-b border-white/[0.02]"
              >
                {/* Name & Icon */}
                <div className="col-span-6 flex items-center gap-3 min-w-0">
                  {renderIcon(item)}
                  <span className="font-medium text-white truncate group-hover:text-emerald-400 transition-colors">
                    {item.name}
                  </span>
                  {!isFolder && item.isFavorite && (
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0 ml-1" />
                  )}
                </div>

                {/* Size */}
                <div className="col-span-2 text-xs text-zinc-400">
                  {isFolder ? '--' : formatFileSize(item.size)}
                </div>

                {/* Modified Date */}
                <div className="col-span-3 text-xs text-zinc-400">
                  {item.updatedAt ? format(new Date(item.updatedAt), 'MMM dd, yyyy HH:mm') : '--'}
                </div>

                {/* Actions */}
                <div className="col-span-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isFolder && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item._id);
                      }}
                      className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-white/10"
                      title="Favorite"
                    >
                      <Heart className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-current text-rose-500' : ''}`} />
                    </button>
                  )}
                  {!isFolder && (
                    <a
                      href={`/api/stream/download/${item._id}?token=${localStorage.getItem('nexora_token')}`}
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRename(item, isFolder);
                    }}
                    className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10"
                    title="Rename"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item._id, isFolder);
                    }}
                    className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
