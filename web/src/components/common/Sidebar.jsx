// web/src/components/common/Sidebar.jsx
import React, { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  HardDrive, 
  Music, 
  Film, 
  FolderSync, 
  Settings, 
  LogOut, 
  Plus, 
  Heart, 
  Clock, 
  Disc3, 
  Cloud,
  Folder,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDrive } from '../../context/DriveContext';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { storageInfo } = useDrive();
  const navigate = useNavigate();

  const disk = storageInfo?.disk;
  const usagePercent = disk?.usagePercent || 0;
  const usedFormatted = disk?.formatted?.used || '0 GB';
  const totalFormatted = disk?.formatted?.total || '500 GB';

  // Handle escape key to close drawer on mobile
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity duration-200"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 md:z-20 w-72 md:w-64 h-full bg-[#121214] border-r border-white/5 flex flex-col justify-between select-none shrink-0 transition-transform duration-200 ease-out md:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand & Main Navigation */}
        <div className="flex flex-col gap-6 p-4 overflow-y-auto">
          {/* Logo & Mobile Close Button */}
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-black font-extrabold text-lg shrink-0">
                N
              </div>
              <div>
                <h1 className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
                  Nexora
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Cloud
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 font-medium">Self-Hosted Personal Suite</p>
              </div>
            </div>

            {/* Close Button on Mobile */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 md:hidden"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        {/* Primary Navigation */}
        <nav className="flex flex-col gap-1">
          <p className="px-3 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase mb-1">
            Apps
          </p>

          <NavLink
            to="/"
            end
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <span>Drive</span>
          </NavLink>

          <NavLink
            to="/music"
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Music className="w-4 h-4 text-emerald-400" />
            <span>Spotify Music</span>
          </NavLink>

          <NavLink
            to="/video"
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Film className="w-4 h-4 text-amber-400" />
            <span>VLC Cinema</span>
          </NavLink>

          <NavLink
            to="/sync"
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <FolderSync className="w-4 h-4 text-indigo-400" />
            <span>Devices & Sync</span>
          </NavLink>
        </nav>

        {/* Music Quick Links */}
        <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
          <p className="px-3 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase mb-1">
            Music Library
          </p>

          <NavLink
            to="/music/favorites"
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'text-white bg-white/10' : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Heart className="w-4 h-4 text-rose-400" />
            <span>Liked Songs</span>
          </NavLink>

          <NavLink
            to="/music/albums"
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'text-white bg-white/10' : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Disc3 className="w-4 h-4 text-purple-400" />
            <span>Albums</span>
          </NavLink>
        </div>
      </div>

      {/* Storage Meter & User Profile */}
      <div className="p-4 flex flex-col gap-4 border-t border-white/5 bg-[#0e0e10]">
        {/* 500GB HDD Storage Bar */}
        <div className="bg-[#18181b] p-3 rounded-xl border border-white/5">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              Arch HDD
            </span>
            <span className="text-zinc-400 font-mono text-[11px]">{usagePercent}%</span>
          </div>

          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usagePercent > 85
                  ? 'bg-rose-500'
                  : usagePercent > 70
                  ? 'bg-amber-400'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400'
              }`}
              style={{ width: `${Math.max(3, usagePercent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>{usedFormatted} used</span>
            <span>{totalFormatted}</span>
          </div>
        </div>

        {/* User Account */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-xs text-emerald-400 shrink-0">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.username || 'User'}</p>
              <p className="text-[10px] text-zinc-400 capitalize">{user?.role || 'Admin'}</p>
            </div>
          </div>

          <button
            onClick={() => {
              handleNavClick();
              logout();
            }}
            title="Sign Out"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
};

