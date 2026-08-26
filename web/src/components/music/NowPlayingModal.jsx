// web/src/components/music/NowPlayingModal.jsx
import React from 'react';
import { X, Heart, Music, Disc3, Mic2, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';

export const NowPlayingModal = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isShuffle,
    repeatMode,
    isNowPlayingOpen,
    setIsNowPlayingOpen,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    toggleShuffle,
    toggleRepeat,
    toggleFavorite
  } = usePlayer();

  if (!isNowPlayingOpen || !currentTrack) return null;

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const token = localStorage.getItem('nexora_token');
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#0c0c0e]/95 backdrop-blur-2xl flex flex-col justify-between p-6 sm:p-12 animate-in fade-in zoom-in-95 duration-200 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-400">
          <Disc3 className="w-5 h-5 text-emerald-400 animate-spin-slow" />
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">
            Playing From Library
          </span>
        </div>

        <button
          onClick={() => setIsNowPlayingOpen(false)}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Center: Large Artwork & Info */}
      <div className="flex flex-col items-center justify-center max-w-md mx-auto w-full">
        {/* Large Album Art */}
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-3xl bg-[#18181b] overflow-hidden shadow-2xl shadow-emerald-500/10 border border-white/10 mb-8">
          {currentTrack.musicMeta?.hasCover && currentTrack.musicMeta?.coverArtFilename ? (
            <img
              src={`/api/stream/thumbnail/${currentTrack.musicMeta.coverArtFilename}?token=${token}`}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-emerald-400">
              <Music className="w-20 h-20" />
            </div>
          )}
        </div>

        {/* Title, Artist, and Favorite */}
        <div className="w-full flex items-center justify-between mb-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
              {currentTrack.musicMeta?.title || currentTrack.name}
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 truncate mt-1">
              {currentTrack.musicMeta?.artist || 'Unknown Artist'} • {currentTrack.musicMeta?.album || 'Unknown Album'}
            </p>
          </div>

          <button
            onClick={() => toggleFavorite(currentTrack._id)}
            className={`p-3 rounded-full transition-colors ${
              currentTrack.isFavorite ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Heart className={`w-6 h-6 ${currentTrack.isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Scrubber */}
        <div className="w-full flex flex-col gap-2 mb-6">
          <div className="relative w-full flex items-center cursor-pointer h-4">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 accent-emerald-400"
              style={{
                background: `linear-gradient(to right, #10b981 ${progressPercent}%, rgba(255,255,255,0.15) ${progressPercent}%)`
              }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Big Controls */}
        <div className="flex items-center justify-between w-full px-4">
          <button
            onClick={toggleShuffle}
            className={`p-2 transition-colors ${isShuffle ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'}`}
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <button onClick={prevTrack} className="p-2 text-zinc-300 hover:text-white transition-colors">
            <SkipBack className="w-7 h-7 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-xl transition-all"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current ml-1" />
            )}
          </button>

          <button onClick={nextTrack} className="p-2 text-zinc-300 hover:text-white transition-colors">
            <SkipForward className="w-7 h-7 fill-current" />
          </button>

          <button
            onClick={toggleRepeat}
            className={`p-2 transition-colors ${repeatMode !== 'off' ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'}`}
          >
            <Repeat className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-center text-xs text-zinc-500 font-mono">
        Bitrate: {currentTrack.musicMeta?.bitrate ? `${Math.round(currentTrack.musicMeta.bitrate / 1000)} kbps` : 'Lossless / Variable'} • Arch Server Direct Play
      </div>
    </div>
  );
};
