// web/src/components/common/MobileNav.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { HardDrive, Music, Film, FolderSync, Menu } from 'lucide-react';

export const MobileNav = ({ onOpenSidebar }) => {
  const navItems = [
    { to: '/', label: 'Drive', icon: HardDrive, end: true },
    { to: '/music', label: 'Music', icon: Music, end: false },
    { to: '/video', label: 'Video', icon: Film, end: false },
    { to: '/sync', label: 'Sync', icon: FolderSync, end: false }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-[#121214]/95 backdrop-blur-xl border-t border-white/10 pb-safe select-none">
      <div className="flex items-center justify-around px-2 py-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'text-emerald-400 font-bold scale-105'
                    : 'text-zinc-400 hover:text-white font-medium'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}

        <button
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-zinc-400 hover:text-white transition-all font-medium"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">More</span>
        </button>
      </div>
    </nav>
  );
};
