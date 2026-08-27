// web/src/components/music/MusicPlayerBar.jsx
import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  Volume2, 
  VolumeX, 
  Volume1, 
  Heart, 
  ListMusic, 
  Maximize2,
  Music
} from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';

export const MusicPlayerBar = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    isQueueOpen,
    setIsQueueOpen,
    setIsNowPlayingOpen,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    toggleFavorite
  } = usePlayer();

  const [isHoveringSeek, setIsHoveringSeek] = useState(false);

  if (!currentTrack) return null;

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const token = localStorage.getItem('nexora_token');

  return (
    <>
      {/* Mobile Mini Player Bar (Floating above MobileNav on < md screens) */}
      <div className="md:hidden fixed bottom-[58px] left-2 right-2 z-30 select-none animate-in slide-in-from-bottom-2 duration-200">
        <div
          onClick={() => setIsNowPlayingOpen(true)}
          className="relative bg-[#18181b]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 px-3 shadow-2xl flex items-center justify-between gap-3 cursor-pointer"
        >
          {/* Progress Indicator Line */}
          <div className="absolute top-0 left-3 right-3 h-[2px] bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Left: Thumbnail & Info */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 overflow-hidden shrink-0 shadow-md">
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
              <p className="text-xs font-bold text-white truncate">
                {currentTrack.musicMeta?.title || currentTrack.name}
              </p>
              <p className="text-[10px] text-zinc-400 truncate">
                {currentTrack.musicMeta?.artist || 'Unknown Artist'}
              </p>
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div
            className="flex items-center gap-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => toggleFavorite(currentTrack._id)}
              className={`p-2 rounded-full transition-colors ${
                currentTrack.isFavorite ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'
              }`}
              title="Favorite"
            >
              <Heart className={`w-4 h-4 ${currentTrack.isFavorite ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-emerald-500 active:scale-95 text-black flex items-center justify-center shadow-lg transition-transform"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className="p-2 text-zinc-400 hover:text-white active:scale-95 transition-colors"
              title="Next Track"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Persistent Bottom Bar (>= md screens) */}
      <footer className="hidden md:flex fixed bottom-0 left-0 right-0 h-20 bg-[#121214] border-t border-white/10 px-4 sm:px-6 items-center justify-between z-30 select-none">
        {/* Left: Track Information & Album Artwork */}
        <div className="flex items-center gap-3 w-1/4 min-w-[180px] max-w-[300px]">
          {/* Album Artwork */}
          <div
            onClick={() => setIsNowPlayingOpen(true)}
            className="relative w-14 h-14 rounded-lg bg-[#1e1e24] overflow-hidden shrink-0 cursor-pointer group shadow-md"
          >
            {currentTrack.musicMeta?.hasCover && currentTrack.musicMeta?.coverArtFilename ? (
              <img
                src={`/api/stream/thumbnail/${currentTrack.musicMeta.coverArtFilename}?token=${token}`}
                alt={currentTrack.musicMeta?.album || 'Album Art'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-emerald-400">
                <Music className="w-6 h-6" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Title & Artist */}
          <div className="min-w-0 flex-1">
            <p
              onClick={() => setIsNowPlayingOpen(true)}
              className="text-xs sm:text-sm font-semibold text-white truncate cursor-pointer hover:underline"
            >
              {currentTrack.musicMeta?.title || currentTrack.name}
            </p>
            <p className="text-[11px] text-zinc-400 truncate">
              {currentTrack.musicMeta?.artist || 'Unknown Artist'}
            </p>
          </div>

          {/* Heart / Favorite Button */}
          <button
            onClick={() => toggleFavorite(currentTrack._id)}
            className={`p-1.5 rounded-full transition-colors ${
              currentTrack.isFavorite ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'
            }`}
            title="Save to your Liked Songs"
          >
            <Heart className={`w-4 h-4 ${currentTrack.isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Center: Playback Controls & Scrubber */}
        <div className="flex flex-col items-center gap-1.5 w-2/4 max-w-xl">
          {/* Buttons */}
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              onClick={toggleShuffle}
              className={`p-1 transition-colors ${
                isShuffle ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'
              }`}
              title="Enable shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={prevTrack}
              className="text-zinc-400 hover:text-white transition-colors"
              title="Previous"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center transition-all shadow-md"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className="text-zinc-400 hover:text-white transition-colors"
              title="Next"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={toggleRepeat}
              className={`p-1 transition-colors ${
                repeatMode !== 'off' ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'
              }`}
              title={`Repeat mode: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>

          {/* Progress Bar (Scrubber) */}
          <div className="w-full flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
            <span className="w-9 text-right shrink-0">{formatTime(currentTime)}</span>

            <div
              className="relative flex-1 flex items-center group cursor-pointer h-3"
              onMouseEnter={() => setIsHoveringSeek(true)}
              onMouseLeave={() => setIsHoveringSeek(false)}
            >
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 group-hover:bg-white/20 accent-emerald-400"
                style={{
                  background: `linear-gradient(to right, #10b981 ${progressPercent}%, rgba(255,255,255,0.15) ${progressPercent}%)`
                }}
              />
            </div>

            <span className="w-9 text-left shrink-0">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Volume & Extra Controls */}
        <div className="flex items-center justify-end gap-3 w-1/4 min-w-[180px]">
          <button
            onClick={() => setIsQueueOpen(!isQueueOpen)}
            className={`p-1.5 rounded-lg transition-colors ${
              isQueueOpen ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-400 hover:text-white'
            }`}
            title="Queue"
          >
            <ListMusic className="w-4 h-4" />
          </button>

          {/* Volume Control */}
          <div className="flex items-center gap-2 group">
            <button
              onClick={toggleMute}
              className="text-zinc-400 hover:text-white transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 h-1 bg-white/10 group-hover:bg-white/20 accent-emerald-400"
              style={{
                background: `linear-gradient(to right, ${
                  isMuted ? 'rgba(255,255,255,0.15)' : '#ffffff'
                } ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.15) ${
                  (isMuted ? 0 : volume) * 100
                }%)`
              }}
            />
          </div>
        </div>
      </footer>
    </>
  );
};
