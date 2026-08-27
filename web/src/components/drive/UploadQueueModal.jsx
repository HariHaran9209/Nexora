// web/src/components/drive/UploadQueueModal.jsx
import React, { useState } from 'react';
import { ChevronUp, ChevronDown, CheckCircle2, AlertCircle, Loader2, X, UploadCloud } from 'lucide-react';
import { useDrive } from '../../context/DriveContext';

export const UploadQueueModal = () => {
  const { uploadQueue, clearCompletedUploads } = useDrive();
  const [isExpanded, setIsExpanded] = useState(true);

  if (uploadQueue.length === 0) return null;

  const completedCount = uploadQueue.filter((q) => q.status === 'completed').length;
  const isAllCompleted = completedCount === uploadQueue.length;

  return (
    <div className="fixed bottom-20 md:bottom-24 left-3 right-3 sm:left-auto sm:right-6 z-40 sm:w-96 glass-panel rounded-2xl border border-white/10 shadow-2xl overflow-hidden transition-all duration-200 animate-in slide-in-from-bottom-5">
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-4 py-3 bg-[#1e1e24] cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <UploadCloud className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white">
            {isAllCompleted
              ? `Uploaded ${completedCount} file${completedCount > 1 ? 's' : ''}`
              : `Uploading ${uploadQueue.length - completedCount} of ${uploadQueue.length}`}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {isAllCompleted && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearCompletedUploads();
              }}
              className="text-[11px] font-semibold text-emerald-400 hover:underline mr-2"
            >
              Clear
            </button>
          )}
          <button className="text-zinc-400 hover:text-white p-0.5">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Upload Items List */}
      {isExpanded && (
        <div className="max-h-60 overflow-y-auto p-3 flex flex-col gap-2.5 bg-[#141416]/95">
          {uploadQueue.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/5"
            >
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-white truncate max-w-[200px]">{item.name}</span>
                <span className="text-[11px] text-zinc-400 shrink-0">
                  {item.status === 'completed' && (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Done
                    </span>
                  )}
                  {item.status === 'error' && (
                    <span className="flex items-center gap-1 text-rose-400">
                      <AlertCircle className="w-3.5 h-3.5" /> Error
                    </span>
                  )}
                  {item.status === 'processing' && (
                    <span className="flex items-center gap-1 text-amber-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Assembling
                    </span>
                  )}
                  {item.status === 'uploading' && (
                    <span className="text-zinc-300 font-mono">{item.progress}%</span>
                  )}
                  {item.status === 'pending' && <span className="text-zinc-500">Queued</span>}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    item.status === 'completed'
                      ? 'bg-emerald-400'
                      : item.status === 'error'
                      ? 'bg-rose-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
