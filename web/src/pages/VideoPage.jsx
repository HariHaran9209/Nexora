// web/src/pages/VideoPage.jsx
import React, { useState, useEffect } from 'react';
import { Film, Play, Clock, Subtitles, Volume2, CheckCircle2 } from 'lucide-react';
import { videoApi } from '../services/api';
import { VlcPlayer } from '../components/video/VlcPlayer';
import { useSearchParams } from 'react-router-dom';

export const VideoPage = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeVideoId, setActiveVideoId] = useState(searchParams.get('play') || null);

  const token = localStorage.getItem('nexora_token');

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const res = await videoApi.getLibrary();
      setVideos(res.data.data.videos || []);
    } catch (err) {
      console.error('Error loading video library:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    const playId = searchParams.get('play');
    if (playId) {
      setActiveVideoId(playId);
    }
  }, [searchParams]);

  const handleOpenVideo = (videoId) => {
    setActiveVideoId(videoId);
    setSearchParams({ play: videoId });
  };

  const handleCloseVideo = () => {
    setActiveVideoId(null);
    setSearchParams({});
    fetchVideos(); // Refresh progress
  };

  const formatDuration = (secs) => {
    if (!secs) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return `${h > 0 ? `${h}:` : ''}${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 select-none">
      {/* Top Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-amber-950/40 via-orange-950/20 to-black/60 p-6 sm:p-8 border border-amber-500/10 mb-6 shrink-0 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center text-black shadow-xl shadow-amber-500/20 shrink-0">
            <Film className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400">Cinema & Media</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">VLC Video Player</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Direct-play video library with multi-audio & subtitle switching from your 500GB HDD
            </p>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-500 mb-4">
              <Film className="w-8 h-8" />
            </div>
            <h4 className="text-base font-semibold text-white mb-1">No videos found</h4>
            <p className="text-sm text-zinc-400 max-w-sm">
              Upload videos in the Drive tab to watch them here with audio and subtitle switching.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {videos.map((video) => {
              const audioCount = video.videoMeta?.audioStreams?.length || 0;
              const subCount = video.videoMeta?.subtitleStreams?.length || 0;
              const progress = video.progress;

              return (
                <div
                  key={video._id}
                  onClick={() => handleOpenVideo(video._id)}
                  className="group flex flex-col rounded-2xl bg-[#18181b] hover:bg-[#222226] border border-white/5 hover:border-amber-500/30 transition-all duration-150 cursor-pointer overflow-hidden shadow-md"
                >
                  {/* Thumbnail Banner */}
                  <div className="relative w-full aspect-video bg-[#121214] overflow-hidden">
                    {video.videoMeta?.hasThumbnail && video.videoMeta?.thumbnailFilename ? (
                      <img
                        src={`/api/stream/thumbnail/${video.videoMeta.thumbnailFilename}?token=${token}`}
                        alt={video.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-amber-400">
                        <Film className="w-12 h-12" />
                      </div>
                    )}

                    {/* Play Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-black shadow-2xl group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      </div>
                    </div>

                    {/* Duration Badge */}
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[11px] font-mono font-semibold text-white">
                      {formatDuration(video.videoMeta?.duration)}
                    </div>

                    {/* Resolution Badge */}
                    {video.videoMeta?.height > 0 && (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold text-amber-400 border border-amber-500/30">
                        {video.videoMeta.height >= 2160
                          ? '4K'
                          : video.videoMeta.height >= 1080
                          ? '1080p'
                          : video.videoMeta.height >= 720
                          ? '720p'
                          : `${video.videoMeta.height}p`}
                      </div>
                    )}

                    {/* Resume Progress Bar */}
                    {progress && progress.percent > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Video Meta Info */}
                  <div className="p-4 flex flex-col justify-between flex-1">
                    <div>
                      <h3 className="text-sm font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                        {video.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400 font-mono">
                        {audioCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Volume2 className="w-3.5 h-3.5 text-zinc-500" />
                            {audioCount} Audio{audioCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {subCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Subtitles className="w-3.5 h-3.5 text-zinc-500" />
                            {subCount} Sub{subCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {progress?.percent > 0 && (
                      <p className="text-[11px] text-amber-400/80 font-mono mt-3">
                        Resume at {formatDuration(progress.positionSeconds)} ({progress.percent}%)
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full VLC Player Modal */}
      {activeVideoId && (
        <VlcPlayer videoId={activeVideoId} onClose={handleCloseVideo} />
      )}
    </div>
  );
};
