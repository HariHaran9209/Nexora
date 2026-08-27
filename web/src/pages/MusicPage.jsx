// web/src/pages/MusicPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Music, 
  Disc3, 
  User, 
  ListMusic, 
  Play, 
  Pause, 
  Heart, 
  Clock, 
  Plus, 
  MoreHorizontal,
  FolderOpen
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { musicApi } from '../services/api';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Modal } from '../components/common/Modal';

export const MusicPage = () => {
  const { currentTrack, isPlaying, playTrack, togglePlay, toggleFavorite } = usePlayer();
  const [activeTab, setActiveTab] = useState('songs'); // 'songs' | 'albums' | 'artists' | 'playlists'
  
  const [tracks, setTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [artists, setArtists] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [albumTracks, setAlbumTracks] = useState([]);

  // Create Playlist Modal
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDesc, setPlaylistDesc] = useState('');

  const [loading, setLoading] = useState(false);
  const parentRef = useRef(null);
  const token = localStorage.getItem('nexora_token');

  const fetchMusicData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'songs') {
        const res = await musicApi.getTracks();
        setTracks(res.data.data.tracks || []);
      } else if (activeTab === 'albums') {
        const res = await musicApi.getAlbums();
        setAlbums(res.data.data || []);
      } else if (activeTab === 'artists') {
        const res = await musicApi.getArtists();
        setArtists(res.data.data || []);
      } else if (activeTab === 'playlists') {
        const res = await musicApi.getPlaylists();
        setPlaylists(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching music data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMusicData();
  }, [activeTab]);

  const loadAlbumDetails = async (albumName) => {
    try {
      const res = await musicApi.getAlbumDetails(albumName);
      setSelectedAlbum(res.data.data);
      setAlbumTracks(res.data.data.tracks || []);
    } catch (err) {
      console.error('Error loading album details:', err);
    }
  };

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (playlistName.trim()) {
      await musicApi.createPlaylist(playlistName.trim(), playlistDesc);
      setPlaylistName('');
      setPlaylistDesc('');
      setIsPlaylistModalOpen(false);
      fetchMusicData();
    }
  };

  const rowVirtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10
  });

  const formatDuration = (secs) => {
    if (!secs) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-3 sm:p-6 select-none">
      {/* Top Spotify Header Banner */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-900/40 via-teal-900/20 to-black/60 p-4 sm:p-6 md:p-8 border border-emerald-500/10 mb-4 sm:mb-6 shrink-0 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-emerald-500 flex items-center justify-center text-black shadow-xl shadow-emerald-500/20 shrink-0">
              <Music className="w-6 h-6 sm:w-8 sm:h-8 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-emerald-400">Library</p>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">Spotify Music</h1>
              <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
                {tracks.length} lossless tracks indexed with ID3 tags
              </p>
            </div>
          </div>

          {/* Tab Navigation (Scrollable on Mobile) */}
          <div className="flex items-center gap-1 bg-[#18181b]/90 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-white/5 overflow-x-auto no-scrollbar max-w-full">
            {[
              { id: 'songs', label: 'Songs', icon: Music },
              { id: 'albums', label: 'Albums', icon: Disc3 },
              { id: 'artists', label: 'Artists', icon: User },
              { id: 'playlists', label: 'Playlists', icon: ListMusic }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id && !selectedAlbum;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedAlbum(null);
                    setActiveTab(tab.id);
                  }}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-emerald-500 text-black shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {/* Album Details View */}
        {selectedAlbum ? (
          <div className="h-full flex flex-col overflow-y-auto pr-1">
            <button
              onClick={() => setSelectedAlbum(null)}
              className="text-xs font-semibold text-emerald-400 hover:underline mb-3 sm:mb-4 inline-flex items-center gap-1"
            >
              ← Back to Albums
            </button>

            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6 mb-4 sm:mb-6 p-4 sm:p-6 rounded-2xl bg-[#18181b] border border-white/5">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-zinc-800 overflow-hidden shrink-0 shadow-xl">
                {selectedAlbum.coverArtFilename ? (
                  <img
                    src={`/api/stream/thumbnail/${selectedAlbum.coverArtFilename}?token=${token}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-emerald-400">
                    <Disc3 className="w-10 h-10 sm:w-12 sm:h-12" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-bold uppercase text-emerald-400">Album</p>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-0.5 sm:mb-1">{selectedAlbum.album}</h2>
                <p className="text-xs sm:text-sm text-zinc-400">
                  {selectedAlbum.artist} • {albumTracks.length} tracks • {selectedAlbum.year || 'Unknown Year'}
                </p>
                <button
                  onClick={() => albumTracks.length > 0 && playTrack(albumTracks[0], albumTracks, 0)}
                  className="mt-3 sm:mt-4 px-4 sm:px-5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-2 shadow-lg mx-auto sm:mx-0"
                >
                  <Play className="w-4 h-4 fill-current" /> Play Album
                </button>
              </div>
            </div>

            {/* Tracks inside album */}
            <div className="flex flex-col gap-1">
              {albumTracks.map((track, idx) => (
                <div
                  key={track._id}
                  onClick={() => playTrack(track, albumTracks, idx)}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl hover:bg-white/5 active:bg-white/10 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <span className="text-xs font-mono text-zinc-500 w-4 text-right">{idx + 1}</span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-white truncate group-hover:text-emerald-400">
                        {track.musicMeta?.title || track.name}
                      </p>
                      <p className="text-[10px] sm:text-xs text-zinc-400 truncate">{track.musicMeta?.artist}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-zinc-400">{formatDuration(track.musicMeta?.duration)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'songs' ? (
          /* Songs Tab: Virtualized Spotify Track Table */
          <div className="h-full flex flex-col">
            <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-white/5">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-5">Title</div>
              <div className="col-span-3">Album</div>
              <div className="col-span-2 hidden md:block">Artist</div>
              <div className="col-span-1 text-right">
                <Clock className="w-3.5 h-3.5 inline" />
              </div>
            </div>

            <div ref={parentRef} className="flex-1 overflow-y-auto gpu-layer will-change-transform">
              <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const track = tracks[virtualRow.index];
                  const isCurrent = currentTrack?._id === track._id;

                  return (
                    <div
                      key={track._id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`
                      }}
                      onClick={() => playTrack(track, tracks, virtualRow.index)}
                      className={`grid grid-cols-12 gap-2 sm:gap-4 px-3 sm:px-4 py-2 items-center rounded-xl transition-colors cursor-pointer group text-sm ${
                        isCurrent ? 'bg-emerald-500/10 text-emerald-400' : 'hover:bg-white/5 active:bg-white/10'
                      }`}
                    >
                      {/* Track # / Play Icon */}
                      <div className="col-span-1 flex items-center justify-center">
                        {isCurrent && isPlaying ? (
                          <div className="w-3.5 h-3.5 flex items-end justify-center gap-0.5">
                            <span className="w-0.5 h-3 bg-emerald-400 animate-pulse" />
                            <span className="w-0.5 h-4 bg-emerald-400 animate-pulse delay-75" />
                            <span className="w-0.5 h-2 bg-emerald-400 animate-pulse delay-150" />
                          </div>
                        ) : (
                          <span className="text-xs font-mono text-zinc-500 group-hover:hidden">
                            {virtualRow.index + 1}
                          </span>
                        )}
                        <Play className="w-3.5 h-3.5 fill-current hidden group-hover:block text-white" />
                      </div>

                      {/* Cover & Title + Artist on mobile */}
                      <div className="col-span-9 sm:col-span-5 flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                          {track.musicMeta?.hasCover && track.musicMeta?.coverArtFilename ? (
                            <img
                              src={`/api/stream/thumbnail/${track.musicMeta.coverArtFilename}?token=${token}`}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Music className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs sm:text-sm font-medium truncate ${isCurrent ? 'text-emerald-400 font-bold' : 'text-white'}`}>
                            {track.musicMeta?.title || track.name}
                          </p>
                          <p className="text-[10px] sm:text-[11px] text-zinc-400 truncate">{track.musicMeta?.artist || 'Unknown Artist'}</p>
                        </div>
                      </div>

                      {/* Album (Tablet & Desktop) */}
                      <div className="hidden sm:block col-span-3 text-xs text-zinc-400 truncate">
                        {track.musicMeta?.album || 'Unknown Album'}
                      </div>

                      {/* Artist (Desktop) */}
                      <div className="hidden md:block col-span-2 text-xs text-zinc-400 truncate">
                        {track.musicMeta?.artist || 'Unknown Artist'}
                      </div>

                      {/* Duration & Favorite */}
                      <div className="col-span-2 sm:col-span-1 flex items-center justify-end gap-1.5 sm:gap-2 text-xs font-mono text-zinc-400">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(track._id);
                          }}
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-emerald-400 transition-opacity"
                        >
                          <Heart className={`w-3.5 h-3.5 ${track.isFavorite ? 'fill-current text-emerald-400 opacity-100' : ''}`} />
                        </button>
                        <span>{formatDuration(track.musicMeta?.duration)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : activeTab === 'albums' ? (
          /* Albums Tab */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4 overflow-y-auto h-full pr-1">
            {albums.map((album, idx) => (
              <div
                key={idx}
                onClick={() => loadAlbumDetails(album.album)}
                className="group flex flex-col p-2.5 sm:p-3 rounded-2xl bg-[#18181b] hover:bg-[#222226] active:bg-[#26262b] border border-white/5 hover:border-white/10 transition-all cursor-pointer shadow-sm"
              >
                <div className="relative w-full aspect-square rounded-xl bg-[#121214] overflow-hidden mb-2.5 sm:mb-3 shadow-md">
                  {album.coverArtFilename ? (
                    <img
                      src={`/api/stream/thumbnail/${album.coverArtFilename}?token=${token}`}
                      alt={album.album}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-emerald-400">
                      <Disc3 className="w-8 h-8 sm:w-10 sm:h-10" />
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500 flex items-center justify-center text-black shadow-xl opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:scale-105">
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
                  </div>
                </div>

                <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-emerald-400">
                  {album.album}
                </h4>
                <p className="text-[10px] sm:text-[11px] text-zinc-400 truncate mt-0.5">
                  {album.artist} • {album.trackCount} tracks
                </p>
              </div>
            ))}
          </div>
        ) : activeTab === 'artists' ? (
          /* Artists Tab */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4 overflow-y-auto h-full pr-1">
            {artists.map((artist, idx) => (
              <div
                key={idx}
                className="group flex flex-col items-center text-center p-3 sm:p-4 rounded-2xl bg-[#18181b] hover:bg-[#222226] active:bg-[#26262b] border border-white/5 transition-all cursor-pointer"
              >
                <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-zinc-800 overflow-hidden mb-2.5 sm:mb-3 shadow-lg flex items-center justify-center border border-white/10">
                  {artist.sampleCover ? (
                    <img
                      src={`/api/stream/thumbnail/${artist.sampleCover}?token=${token}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 sm:w-12 sm:h-12 text-emerald-400" />
                  )}
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-white truncate w-full">{artist.artist}</h4>
                <p className="text-[10px] sm:text-xs text-zinc-400 mt-0.5">{artist.trackCount} songs</p>
              </div>
            ))}
          </div>
        ) : (
          /* Playlists Tab */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-4 overflow-y-auto h-full pr-1">
            {/* Create New Playlist Card */}
            <div
              onClick={() => setIsPlaylistModalOpen(true)}
              className="flex flex-col items-center justify-center aspect-square rounded-2xl border-2 border-dashed border-white/10 hover:border-emerald-500/50 bg-[#18181b]/50 hover:bg-emerald-500/5 transition-all cursor-pointer p-4 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-emerald-400 mb-2">
                <Plus className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-white">Create Playlist</span>
            </div>

            {playlists.map((playlist) => (
              <div
                key={playlist._id}
                className="group flex flex-col p-3 rounded-2xl bg-[#18181b] hover:bg-[#222226] border border-white/5 transition-all cursor-pointer"
              >
                <div className="w-full aspect-square rounded-xl bg-gradient-to-tr from-emerald-800 to-teal-900 flex items-center justify-center text-white mb-3 shadow-md">
                  <ListMusic className="w-12 h-12 opacity-80" />
                </div>
                <h4 className="text-sm font-semibold text-white truncate">{playlist.name}</h4>
                <p className="text-xs text-zinc-400 mt-0.5">{playlist.tracks?.length || 0} tracks</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Playlist Modal */}
      <Modal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        title="Create New Playlist"
      >
        <form onSubmit={handleCreatePlaylist} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-400 mb-1 block">Playlist Name</label>
            <input
              type="text"
              autoFocus
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              placeholder="e.g. Chill Vibes, Workout 2026"
              className="w-full bg-[#121214] border border-white/10 focus:border-emerald-500 px-4 py-2.5 rounded-xl text-sm text-white outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-400 mb-1 block">Description (optional)</label>
            <textarea
              value={playlistDesc}
              onChange={(e) => setPlaylistDesc(e.target.value)}
              rows={2}
              className="w-full bg-[#121214] border border-white/10 focus:border-emerald-500 px-4 py-2 rounded-xl text-sm text-white outline-none resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsPlaylistModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!playlistName.trim()}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Create
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
