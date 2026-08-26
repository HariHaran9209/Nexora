// web/src/components/music/QueueDrawer.jsx
import React from 'react';
import { X, Trash2, Play, Music } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';

export const QueueDrawer = () => {
  const { queue, queueIndex, currentTrack, isQueueOpen, setIsQueueOpen, playTrack, removeFromQueue } = usePlayer();

  if (!isQueueOpen) return null;

  const upcomingTracks = queue.slice(queueIndex + 1);
  const token = localStorage.getItem('nexora_token');

  return (
    <div className="fixed top-0 right-0 bottom-20 w-80 sm:w-96 bg-[#141416]/95 backdrop-blur-xl border-l border-white/10 p-6 flex flex-col z-30 shadow-2xl animate-in slide-in-from-right duration-200 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
        <h3 className="font-bold text-lg text-white">Play Queue</h3>
        <button
          onClick={() => setIsQueueOpen(false)}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Now Playing Section */}
      {currentTrack && (
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">Now Playing</p>
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-11 h-11 rounded-lg bg-zinc-800 overflow-hidden shrink-0">
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
              <p className="text-sm font-semibold text-white truncate">{currentTrack.musicMeta?.title || currentTrack.name}</p>
              <p className="text-xs text-zinc-400 truncate">{currentTrack.musicMeta?.artist || 'Unknown Artist'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Next Up Section */}
      <div className="flex-1 overflow-y-auto pr-1">
        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Next in Queue</p>

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
                    className="p-1 rounded text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
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
  );
};
