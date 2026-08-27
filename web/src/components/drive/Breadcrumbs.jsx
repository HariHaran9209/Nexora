// web/src/components/drive/Breadcrumbs.jsx
import React from 'react';
import { ChevronRight, HardDrive, Folder } from 'lucide-react';
import { useDrive } from '../../context/DriveContext';

export const Breadcrumbs = () => {
  const { breadcrumbs, setCurrentFolderId, fetchFiles } = useDrive();

  const handleNavigate = (folderId) => {
    setCurrentFolderId(folderId);
    fetchFiles({ folderId, category: null, search: '' });
  };

  return (
    <nav className="flex items-center gap-1 sm:gap-1.5 text-xs font-medium text-zinc-400 overflow-x-auto no-scrollbar py-1 max-w-full">
      {breadcrumbs.map((crumb, idx) => {
        const isLast = idx === breadcrumbs.length - 1;

        return (
          <React.Fragment key={crumb.id || 'root'}>
            {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />}
            <button
              onClick={() => handleNavigate(crumb.id)}
              disabled={isLast}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                isLast
                  ? 'text-white font-semibold bg-white/5 cursor-default'
                  : 'hover:text-white hover:bg-white/5'
              }`}
            >
              {idx === 0 ? (
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{crumb.name}</span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
