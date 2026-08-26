// web/src/components/video/VlcPlayer.jsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Volume1, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  Subtitles, 
  Headphones, 
  Gauge, 
  ArrowLeft, 
  Sliders, 
  Keyboard, 
  Check,
  Film
} from 'lucide-react';
import { videoApi } from '../../services/api';

export const VlcPlayer = ({ videoId, onClose }) => {
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  const [details, setDetails] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState(null);

  // Tracks & Subtitles
  const [audioStreams, setAudioStreams] = useState([]);
  const [selectedAudioIndex, setSelectedAudioIndex] = useState(0);
  const [subtitleStreams, setSubtitleStreams] = useState([]);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState(-1); // -1 = off
  const [activeSubTrackUrl, setActiveSubTrackUrl] = useState(null);

  // Menus
  const [openMenu, setOpenMenu] = useState(null); // 'subtitles' | 'audio' | 'speed' | 'shortcuts'
  const [toastMessage, setToastMessage] = useState(null);
  const [resumedPrompt, setResumedPrompt] = useState(null);

  const token = localStorage.getItem('nexora_token');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Fetch video details and streams
  useEffect(() => {
    let isMounted = true;
    const loadDetails = async () => {
      try {
        const res = await videoApi.getDetails(videoId);
        if (!isMounted) return;
        const data = res.data.data;
        setDetails(data);
        setAudioStreams(data.audioStreams || []);
        setSubtitleStreams(data.subtitleStreams || []);

        // Check if there was saved resume progress
        if (data.progress && data.progress.positionSeconds > 10 && !data.progress.completed) {
          setResumedPrompt(data.progress.positionSeconds);
        }
      } catch (err) {
        console.error('Error loading video details:', err);
      }
    };

    loadDetails();
    return () => {
      isMounted = false;
    };
  }, [videoId]);

  // Periodic progress saving (every 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && duration > 0 && !videoRef.current.paused) {
        videoApi.saveProgress(
          videoId,
          videoRef.current.currentTime,
          duration,
          selectedAudioIndex,
          selectedSubtitleIndex
        ).catch(console.warn);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [videoId, duration, selectedAudioIndex, selectedSubtitleIndex]);

  // Video event handlers
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || details?.videoMeta?.duration || 0);
      if (resumedPrompt) {
        videoRef.current.currentTime = resumedPrompt;
        showToast(`Resumed playback at ${formatTime(resumedPrompt)}`);
        setResumedPrompt(null);
      }
      videoRef.current.play().catch(console.warn);
    }
  };

  // Controls Visibility Timer
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout) clearTimeout(controlsTimeout);
    const timeout = setTimeout(() => {
      if (isPlaying && !openMenu) {
        setShowControls(false);
      }
    }, 3000);
    setControlsTimeout(timeout);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      showToast('Pause');
    } else {
      videoRef.current.play();
      showToast('Play');
    }
  };

  const handleSeek = (secs) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = secs;
    setCurrentTime(secs);
  };

  const changeVolume = (newVol) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolume(clamped);
    if (videoRef.current) videoRef.current.volume = clamped;
    if (clamped > 0) setIsMuted(false);
    showToast(`Volume: ${Math.round(clamped * 100)}%`);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.volume = volume;
      setIsMuted(false);
      showToast(`Volume: ${Math.round(volume * 100)}%`);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
      showToast('Mute');
    }
  };

  const changeSpeed = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
    showToast(`Speed: ${speed}x`);
    setOpenMenu(null);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.warn);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.warn);
      setIsFullscreen(false);
    }
  };

  // Subtitle Selection
  const selectSubtitle = (index) => {
    setSelectedSubtitleIndex(index);
    if (index === -1) {
      setActiveSubTrackUrl(null);
      showToast('Subtitles: Off');
    } else {
      const sub = subtitleStreams[index];
      if (sub.isExternal) {
        setActiveSubTrackUrl(`/api/stream/file/${sub.fileId}?token=${token}`);
      } else {
        setActiveSubTrackUrl(`/api/stream/subtitle/${videoId}/${sub.index}?token=${token}`);
      }
      showToast(`Subtitle: ${sub.title || sub.language}`);
    }
    setOpenMenu(null);
  };

  // VLC Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case ' ': // Space = Play/Pause
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.ctrlKey) {
            handleSeek(video.currentTime + 60);
            showToast('+1m');
          } else if (e.shiftKey) {
            handleSeek(video.currentTime + 15);
            showToast('+15s');
          } else {
            handleSeek(video.currentTime + 5);
            showToast('+5s');
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.ctrlKey) {
            handleSeek(Math.max(0, video.currentTime - 60));
            showToast('-1m');
          } else if (e.shiftKey) {
            handleSeek(Math.max(0, video.currentTime - 15));
            showToast('-15s');
          } else {
            handleSeek(Math.max(0, video.currentTime - 5));
            showToast('-5s');
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(volume + 0.05);
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(volume - 0.05);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 's':
        case 'S':
          e.preventDefault();
          selectSubtitle(selectedSubtitleIndex === -1 && subtitleStreams.length > 0 ? 0 : -1);
          break;
        case 'v':
        case 'V': // Cycle next subtitle
          e.preventDefault();
          if (subtitleStreams.length > 0) {
            const nextSubIdx = selectedSubtitleIndex + 1 >= subtitleStreams.length ? -1 : selectedSubtitleIndex + 1;
            selectSubtitle(nextSubIdx);
          }
          break;
        case '[': // Slow down
          e.preventDefault();
          changeSpeed(Math.max(0.25, playbackSpeed - 0.25));
          break;
        case ']': // Speed up
          e.preventDefault();
          changeSpeed(Math.min(3.0, playbackSpeed + 0.25));
          break;
        case 'Escape':
          if (openMenu) {
            setOpenMenu(null);
          } else if (!document.fullscreenElement && onClose) {
            onClose();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, volume, isMuted, playbackSpeed, selectedSubtitleIndex, subtitleStreams, openMenu, onClose]);

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '00:00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return `${h > 0 ? `${h}:` : ''}${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden"
    >
      {/* HTML5 Video Element with HTTP-206 byte serving */}
      <video
        ref={videoRef}
        src={`/api/stream/file/${videoId}?token=${token}`}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer"
        playsInline
      >
        {/* Dynamic WebVTT Subtitle Track */}
        {activeSubTrackUrl && (
          <track
            key={activeSubTrackUrl}
            src={activeSubTrackUrl}
            kind="subtitles"
            srcLang="en"
            label="Subtitles"
            default
          />
        )}
      </video>

      {/* Center Toast Feedback (VLC On Screen Display) */}
      {toastMessage && (
        <div className="absolute top-10 right-10 bg-black/80 backdrop-blur-md px-4 py-2 rounded-lg border border-amber-500/30 text-amber-400 font-mono text-sm font-semibold shadow-xl animate-in fade-in zoom-in-90 duration-150">
          {toastMessage}
        </div>
      )}

      {/* Top Header Controls */}
      <div
        className={`absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-white truncate">
              {details?.video?.name || 'VLC Video Player'}
            </h2>
            <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono mt-0.5">
              <span>{details?.videoMeta?.codec?.toUpperCase() || 'H.264'}</span>
              <span>•</span>
              <span>{details?.videoMeta?.width}x{details?.videoMeta?.height}</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">VLC Cinema Mode</span>
            </div>
          </div>
        </div>

        {/* Shortcuts Help Button */}
        <button
          onClick={() => setOpenMenu(openMenu === 'shortcuts' ? null : 'shortcuts')}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
          title="VLC Keyboard Shortcuts"
        >
          <Keyboard className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Shortcuts</span>
        </button>
      </div>

      {/* VLC Bottom Controls Toolbar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-3 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Scrubber (VLC signature Orange Accent) */}
        <div className="w-full flex items-center gap-3 text-xs font-mono text-zinc-300">
          <span>{formatTime(currentTime)}</span>
          <div className="relative flex-1 flex items-center h-4 cursor-pointer group">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/20 accent-amber-500 rounded-full group-hover:h-2 transition-all"
              style={{
                background: `linear-gradient(to right, #f59e0b ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`
              }}
            />
          </div>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center justify-between">
          {/* Left: Play/Pause, Rewind, Forward, Volume */}
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-black flex items-center justify-center shadow-lg shadow-amber-500/20 transition-all"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => handleSeek(Math.max(0, currentTime - 10))}
              className="p-2 text-zinc-400 hover:text-white transition-colors"
              title="Rewind 10s"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-colors">
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-rose-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={isMuted ? 0 : volume}
                onChange={(e) => changeVolume(parseFloat(e.target.value))}
                className="w-20 h-1 bg-white/20 accent-amber-500"
              />
            </div>
          </div>

          {/* Right: Subtitles, Audio Tracks, Speed, Fullscreen */}
          <div className="flex items-center gap-3 relative">
            {/* Subtitle Selector */}
            <div className="relative">
              <button
                onClick={() => setOpenMenu(openMenu === 'subtitles' ? null : 'subtitles')}
                className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold ${
                  selectedSubtitleIndex !== -1
                    ? 'text-amber-400 bg-amber-500/20 border border-amber-500/30'
                    : 'text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
                title="Subtitles"
              >
                <Subtitles className="w-5 h-5" />
                <span className="hidden sm:inline">Subs</span>
              </button>

              {openMenu === 'subtitles' && (
                <div className="absolute bottom-12 right-0 w-64 bg-[#18181b] border border-white/10 rounded-xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 text-xs">
                  <p className="font-bold text-zinc-400 px-3 py-1.5 uppercase tracking-wider text-[10px]">
                    Subtitle Tracks ({subtitleStreams.length})
                  </p>
                  <div
                    onClick={() => selectSubtitle(-1)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      selectedSubtitleIndex === -1 ? 'bg-amber-500/20 text-amber-400 font-semibold' : 'text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <span>Off</span>
                    {selectedSubtitleIndex === -1 && <Check className="w-4 h-4" />}
                  </div>
                  {subtitleStreams.map((sub, idx) => (
                    <div
                      key={idx}
                      onClick={() => selectSubtitle(idx)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        selectedSubtitleIndex === idx ? 'bg-amber-500/20 text-amber-400 font-semibold' : 'text-zinc-300 hover:bg-white/5'
                      }`}
                    >
                      <span className="truncate">{sub.title || `${sub.language} (${sub.codec})`}</span>
                      {selectedSubtitleIndex === idx && <Check className="w-4 h-4" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audio Stream Selector */}
            <div className="relative">
              <button
                onClick={() => setOpenMenu(openMenu === 'audio' ? null : 'audio')}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                title="Audio Tracks"
              >
                <Headphones className="w-5 h-5" />
                <span className="hidden sm:inline">Audio</span>
              </button>

              {openMenu === 'audio' && (
                <div className="absolute bottom-12 right-0 w-64 bg-[#18181b] border border-white/10 rounded-xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 text-xs">
                  <p className="font-bold text-zinc-400 px-3 py-1.5 uppercase tracking-wider text-[10px]">
                    Audio Streams ({audioStreams.length})
                  </p>
                  {audioStreams.map((audio, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedAudioIndex(idx);
                        showToast(`Audio: ${audio.title || audio.language}`);
                        setOpenMenu(null);
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        selectedAudioIndex === idx ? 'bg-amber-500/20 text-amber-400 font-semibold' : 'text-zinc-300 hover:bg-white/5'
                      }`}
                    >
                      <span className="truncate">{audio.title || `${audio.language} (${audio.codec})`}</span>
                      {selectedAudioIndex === idx && <Check className="w-4 h-4" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Speed Selector */}
            <div className="relative">
              <button
                onClick={() => setOpenMenu(openMenu === 'speed' ? null : 'speed')}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 text-xs font-mono font-semibold"
                title="Playback Speed"
              >
                <Gauge className="w-4 h-4 text-amber-400" />
                <span>{playbackSpeed}x</span>
              </button>

              {openMenu === 'speed' && (
                <div className="absolute bottom-12 right-0 w-36 bg-[#18181b] border border-white/10 rounded-xl p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 text-xs font-mono">
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                    <div
                      key={s}
                      onClick={() => changeSpeed(s)}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer ${
                        playbackSpeed === s ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-zinc-300 hover:bg-white/5'
                      }`}
                    >
                      <span>{s}x</span>
                      {playbackSpeed === s && <Check className="w-3.5 h-3.5" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Fullscreen (F)"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {openMenu === 'shortcuts' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setOpenMenu(null)} />
          <div className="relative w-full max-w-md bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-2xl z-10">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-amber-400" />
              VLC Keyboard Conventions
            </h3>

            <div className="flex flex-col gap-2.5 text-xs text-zinc-300">
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span>Play / Pause</span>
                <kbd className="px-2 py-0.5 bg-zinc-800 rounded font-mono text-amber-400">Space</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span>Seek ±5 Seconds</span>
                <kbd className="px-2 py-0.5 bg-zinc-800 rounded font-mono text-amber-400">← / →</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span>Seek ±1 Minute</span>
                <kbd className="px-2 py-0.5 bg-zinc-800 rounded font-mono text-amber-400">Ctrl + ← / →</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span>Volume Up / Down</span>
                <kbd className="px-2 py-0.5 bg-zinc-800 rounded font-mono text-amber-400">↑ / ↓</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span>Mute / Unmute</span>
                <kbd className="px-2 py-0.5 bg-zinc-800 rounded font-mono text-amber-400">M</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span>Toggle Fullscreen</span>
                <kbd className="px-2 py-0.5 bg-zinc-800 rounded font-mono text-amber-400">F</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span>Cycle Subtitle Track</span>
                <kbd className="px-2 py-0.5 bg-zinc-800 rounded font-mono text-amber-400">V</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span>Speed Down / Up</span>
                <kbd className="px-2 py-0.5 bg-zinc-800 rounded font-mono text-amber-400">[ / ]</kbd>
              </div>
            </div>

            <button
              onClick={() => setOpenMenu(null)}
              className="w-full mt-6 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
