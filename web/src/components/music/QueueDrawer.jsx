// web/src/components/music/QueueDrawer.jsx
import React, { useEffect } from 'react';
import { X, Trash2, Play, Music } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';

export const QueueDrawer = () => {
  const { queue, queueIndex, currentTrack, isQueueOpen, setIsQueueOpen, playTrack, removeFromQueue } = usePlayer();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isQueueOpen) {
        setIsQueueOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQueueOpen, setIsQueueOpen]);

  if (!isQueueOpen) return null;

  const upcomingTracks = queue.slice(queueIndex + 1);
  const token = localStorage.getItem('nexora_token');

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
        onClick={() => setIsQueueOpen(false)}
      />

      <div className="fixed top-0 right-0 bottom-0 md:bottom-20 w-full max-w-md md:w-96 bg-[#141416]/98 backdrop-blur-2xl border-l border-white/10 p-4 sm:p-6 flex flex-col z-50 md:z-30 shadow-2xl animate-in slide-in-from-right duration-200 select-none pb-safe">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-white/5">
          <h3 className="font-bold text-base sm:text-lg text-white">Play Queue</h3>
          <button
            onClick={() => setIsQueueOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Close Queue"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Now Playing Section */}
        {currentTrack && (
          <div className="mb-4 sm:mb-6 shrink-0">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">Now Playing</p>
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-zinc-800 overflow-hidden shrink-0">
                {currentTrack.musicMeta?.hasCover && currentTrack.musicMeta?.coverArtFilename ? (
                  <img
                    src={`/api/stream/thumbnail/${currentTrack.musicMeta.coverArtFilename}?token=${token}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-emerald-400">
                    <Music className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-white truncate">{currentTrack.musicMeta?.title || currentTrack.name}</p>
                <p className="text-[11px] sm:text-xs text-zinc-400 truncate">{currentTrack.musicMeta?.artist || 'Unknown Artist'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Next Up Section */}
        <div className="flex-1 overflow-y-auto pr-1">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
            Next in Queue ({upcomingTracks.length})
          </p>

          {upcomingTracks.length === 0 ? (
            <p className="text-xs text-zinc-500 italic py-4">No upcoming tracks in queue.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {upcomingTracks.map((track, idx) => {
                const actualIdx = queueIndex + 1 + idx;
                return (
                  <div
                    key={`${track._id}_${actualIdx}`}
                    className="group flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => playTrack(track, queue, actualIdx)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                        {track.musicMeta?.hasCover && track.musicMeta?.coverArtFilename ? (
                          <img
                            src={`/api/stream/thumbnail/${track.musicMeta.coverArtFilename}?token=${token}`}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Music className="w-4 h-4 text-zinc-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white truncate group-hover:text-emerald-400 transition-colors">
                          {track.musicMeta?.title || track.name}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">{track.musicMeta?.artist || 'Unknown Artist'}</p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(actualIdx);
                      }}
                      className="p-1 rounded text-zinc-500 hover:text-rose-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

