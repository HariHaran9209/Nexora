// web/src/components/drive/FileGrid.jsx
import React from 'react';
import { 
  Folder, 
  Music, 
  Film, 
  Image as ImageIcon, 
  FileText, 
  Archive, 
  File, 
  Heart, 
  MoreVertical, 
  Download, 
  Trash2, 
  Edit2, 
  Play
} from 'lucide-react';
import { useDrive } from '../../context/DriveContext';
import { usePlayer } from '../../context/PlayerContext';
import { useNavigate } from 'react-router-dom';

export const FileGrid = ({ onRename, onMove, onDelete }) => {
  const { folders, files, setCurrentFolderId, fetchFiles, toggleFavorite } = useDrive();
  const { playTrack } = usePlayer();
  const navigate = useNavigate();

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
      // Direct download or preview
      const token = localStorage.getItem('nexora_token');
      window.open(`/api/stream/file/${file._id}?token=${token}`, '_blank');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderIcon = (category, file) => {
    const token = localStorage.getItem('nexora_token');

    if (category === 'image') {
      return (
        <img
          src={`/api/stream/file/${file._id}?token=${token}`}
          alt={file.name}
          className="w-full h-full object-cover rounded-lg"
          loading="lazy"
        />
      );
    }

    if (category === 'audio') {
      if (file.musicMeta?.hasCover && file.musicMeta?.coverArtFilename) {
        return (
          <img
            src={`/api/stream/thumbnail/${file.musicMeta.coverArtFilename}?token=${token}`}
            alt={file.name}
            className="w-full h-full object-cover rounded-lg"
            loading="lazy"
          />
        );
      }
      return (
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
          <Music className="w-6 h-6" />
        </div>
      );
    }

    if (category === 'video') {
      if (file.videoMeta?.hasThumbnail && file.videoMeta?.thumbnailFilename) {
        return (
          <div className="relative w-full h-full">
            <img
              src={`/api/stream/thumbnail/${file.videoMeta.thumbnailFilename}?token=${token}`}
              alt={file.name}
              className="w-full h-full object-cover rounded-lg"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-black shadow-lg">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
            </div>
          </div>
        );
      }
      return (
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
          <Film className="w-6 h-6" />
        </div>
      );
    }

    if (category === 'document') {
      return (
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
          <FileText className="w-6 h-6" />
        </div>
      );
    }

    if (category === 'archive') {
      return (
        <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
          <Archive className="w-6 h-6" />
        </div>
      );
    }

    return (
      <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400">
        <File className="w-6 h-6" />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 select-none">
      {/* Folders Section */}
      {folders.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5 sm:mb-3">Folders</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
            {folders.map((folder) => (
              <div
                key={folder._id}
                onDoubleClick={() => handleOpenFolder(folder._id)}
                className="group relative flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-[#18181b] hover:bg-[#222226] active:bg-[#26262b] border border-white/5 hover:border-white/10 transition-all cursor-pointer shadow-sm"
              >
                <div
                  className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1"
                  onClick={() => handleOpenFolder(folder._id)}
                >
                  <Folder className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0 fill-amber-400/20" />
                  <span className="text-xs sm:text-sm font-medium text-white truncate">{folder.name}</span>
                </div>

                <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRename(folder, true);
                    }}
                    title="Rename"
                    className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(folder._id, true);
                    }}
                    title="Delete"
                    className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files Section */}
      <div>
        {folders.length > 0 && files.length > 0 && (
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5 sm:mb-3">Files</h3>
        )}

        {files.length === 0 && folders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-500 mb-4">
              <Folder className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h4 className="text-sm sm:text-base font-semibold text-white mb-1">This folder is empty</h4>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-sm">
              Drag and drop files here or click the Upload button to store them on your Arch laptop's 500GB HDD.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
            {files.map((file) => (
              <div
                key={file._id}
                onClick={() => handleFileClick(file)}
                className="group relative flex flex-col p-2.5 sm:p-3 rounded-2xl bg-[#18181b] hover:bg-[#222226] active:bg-[#26262b] border border-white/5 hover:border-white/10 transition-all duration-150 cursor-pointer shadow-sm"
              >
                {/* Thumbnail / Icon Container */}
                <div className="relative w-full aspect-square rounded-xl bg-[#121214] overflow-hidden flex items-center justify-center mb-2.5 sm:mb-3">
                  {renderIcon(file.category, file)}

                  {/* Favorite Button Overlay */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(file._id);
                    }}
                    className={`absolute top-1.5 right-1.5 sm:top-2 sm:right-2 p-1.5 rounded-full backdrop-blur-md transition-all ${
                      file.isFavorite
                        ? 'bg-rose-500/20 text-rose-500 opacity-100'
                        : 'bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-rose-500/30'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${file.isFavorite ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* File Details */}
                <div className="flex items-start justify-between gap-1 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate group-hover:text-emerald-400 transition-colors">
                      {file.name}
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5">{formatFileSize(file.size)}</p>
                  </div>

                  {/* Action Menu Buttons */}
                  <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <a
                      href={`/api/stream/download/${file._id}?token=${localStorage.getItem('nexora_token')}`}
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRename(file, false);
                      }}
                      className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10"
                      title="Rename"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(file._id, false);
                      }}
                      className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
