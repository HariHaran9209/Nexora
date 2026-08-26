// web/src/components/common/TopNav.jsx
import React, { useRef } from 'react';
import { Search, Upload, FolderPlus, Wifi, Bell, ArrowLeft, ArrowRight } from 'lucide-react';
import { useDrive } from '../../context/DriveContext';
import { useNavigate, useLocation } from 'react-router-dom';

export const TopNav = ({ onNewFolder }) => {
  const { searchQuery, setSearchQuery, enqueueUploads } = useDrive();
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      enqueueUploads(e.target.files);
      e.target.value = ''; // Reset input
    }
  };

  const getPlaceholder = () => {
    if (location.pathname.startsWith('/music')) return 'Search songs, artists, albums...';
    if (location.pathname.startsWith('/video')) return 'Search videos and movies...';
    return 'Search files, folders, documents...';
  };

  return (
    <header className="h-16 border-b border-white/5 bg-[#121214]/80 backdrop-blur-md px-6 flex items-center justify-between gap-4 select-none z-10 shrink-0">
      {/* Navigation Arrows & Search Input */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="flex items-center gap-1 text-zinc-400">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(1)}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            title="Go forward"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={getPlaceholder()}
            className="w-full bg-[#1e1e24] hover:bg-[#26262d] focus:bg-[#26262d] text-sm text-white placeholder-zinc-400 pl-10 pr-4 py-2 rounded-full border border-white/5 focus:border-emerald-500/50 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons & Status */}
      <div className="flex items-center gap-3">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
        />

        {/* Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-semibold text-xs rounded-lg shadow-lg shadow-emerald-500/10 transition-all duration-150"
        >
          <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Upload</span>
        </button>

        {/* New Folder Button (if in Drive) */}
        {onNewFolder && (
          <button
            onClick={onNewFolder}
            className="flex items-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-white/10 active:scale-95 text-zinc-200 hover:text-white font-medium text-xs rounded-lg border border-white/5 transition-all"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New Folder</span>
          </button>
        )}

        {/* Tailscale / Home Server Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden sm:inline">Arch Laptop Online</span>
        </div>
      </div>
    </header>
  );
};
