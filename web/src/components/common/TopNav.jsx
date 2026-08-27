// web/src/components/common/TopNav.jsx
import React, { useRef } from 'react';
import { Search, Upload, FolderPlus, Wifi, Bell, ArrowLeft, ArrowRight, Menu } from 'lucide-react';
import { useDrive } from '../../context/DriveContext';
import { useNavigate, useLocation } from 'react-router-dom';

export const TopNav = ({ onNewFolder, onOpenSidebar }) => {
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
    if (location.pathname.startsWith('/music')) return 'Search songs, artists...';
    if (location.pathname.startsWith('/video')) return 'Search videos...';
    return 'Search files, folders...';
  };

  return (
    <header className="h-14 sm:h-16 border-b border-white/5 bg-[#121214]/80 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 select-none z-10 shrink-0">
      {/* Mobile Hamburger & Navigation Arrows & Search Input */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 max-w-xl">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white md:hidden shrink-0 transition-colors"
          title="Open Menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Back/Forward Navigation Arrows (Tablet / Desktop) */}
        <div className="hidden sm:flex items-center gap-1 text-zinc-400 shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            title="Go back"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={() => navigate(1)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            title="Go forward"
          >
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={getPlaceholder()}
            className="w-full bg-[#1e1e24] hover:bg-[#26262d] focus:bg-[#26262d] text-xs sm:text-sm text-white placeholder-zinc-400 pl-8 sm:pl-10 pr-7 sm:pr-8 py-1.5 sm:py-2 rounded-full border border-white/5 focus:border-emerald-500/50 outline-none transition-all truncate"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs text-zinc-400 hover:text-white"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons & Status */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
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
          className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-semibold text-xs rounded-lg shadow-lg shadow-emerald-500/10 transition-all duration-150"
          title="Upload files"
        >
          <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="hidden xs:inline">Upload</span>
        </button>

        {/* New Folder Button (if in Drive) */}
        {onNewFolder && (
          <button
            onClick={onNewFolder}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-white/5 hover:bg-white/10 active:scale-95 text-zinc-200 hover:text-white font-medium text-xs rounded-lg border border-white/5 transition-all"
            title="Create New Folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Folder</span>
          </button>
        )}

        {/* Tailscale / Home Server Indicator */}
        <div
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium"
          title="Arch Laptop Online (Tailscale Direct Connection)"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="hidden md:inline">Arch Laptop Online</span>
        </div>
      </div>
    </header>
  );
};

