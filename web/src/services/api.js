// web/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

// Attach JWT token to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexora_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401 Unauthorized to trigger logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('nexora_token');
        localStorage.removeItem('nexora_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  getStatus: () => api.get('/auth/status'),
  login: (identifier, password) => api.post('/auth/login', { identifier, password }),
  register: (username, email, password) => api.post('/auth/register', { username, email, password }),
  getMe: () => api.get('/auth/me')
};

export const filesApi = {
  getFiles: (params) => api.get('/files', { params }),
  createFolder: (name, parentFolderId) => api.post('/files/folder', { name, parentFolderId }),
  renameItem: (id, name, isFolder) => api.put(`/files/${id}/rename`, { name, isFolder }),
  moveItem: (id, targetFolderId, isFolder) => api.put(`/files/${id}/move`, { targetFolderId, isFolder }),
  toggleFavorite: (id) => api.put(`/files/${id}/favorite`),
  deleteItem: (id, isFolder, permanent = false) => api.delete(`/files/${id}`, { params: { isFolder, permanent } }),
  restoreItem: (id, isFolder) => api.put(`/files/${id}/restore`, { isFolder })
};

export const uploadApi = {
  uploadSingle: (formData, onProgress) =>
    api.post('/upload/single', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
    }),
  initChunk: (filename, totalSize, totalChunks, parentFolderId) =>
    api.post('/upload/chunk/init', { filename, totalSize, totalChunks, parentFolderId }),
  uploadChunk: (uploadId, chunkIndex, chunkBlob) => {
    const data = new FormData();
    data.append('uploadId', uploadId);
    data.append('chunkIndex', chunkIndex);
    data.append('chunk', chunkBlob);
    return api.post('/upload/chunk/upload', data);
  },
  getChunkStatus: (uploadId) => api.get(`/upload/chunk/status/${uploadId}`),
  completeChunk: (uploadId, parentFolderId) => api.post('/upload/chunk/complete', { uploadId, parentFolderId }),
  cancelChunk: (uploadId) => api.post('/upload/chunk/cancel', { uploadId })
};

export const musicApi = {
  getTracks: (params) => api.get('/music/tracks', { params }),
  getArtists: () => api.get('/music/artists'),
  getAlbums: () => api.get('/music/albums'),
  getAlbumDetails: (albumName) => api.get(`/music/album/${encodeURIComponent(albumName)}`),
  getPlaylists: () => api.get('/music/playlists'),
  createPlaylist: (name, description) => api.post('/music/playlists', { name, description }),
  getPlaylistDetails: (id) => api.get(`/music/playlists/${id}`),
  addTrackToPlaylist: (playlistId, fileId) => api.post(`/music/playlists/${playlistId}/tracks`, { fileId }),
  removeTrackFromPlaylist: (playlistId, fileId) => api.delete(`/music/playlists/${playlistId}/tracks/${fileId}`),
  deletePlaylist: (id) => api.delete(`/music/playlists/${id}`),
  getFavorites: () => api.get('/music/favorites'),
  logPlay: (fileId) => api.post('/music/history', { fileId }),
  getRecentlyPlayed: () => api.get('/music/recently-played')
};

export const videoApi = {
  getLibrary: (params) => api.get('/video/library', { params }),
  getDetails: (id) => api.get(`/video/${id}/details`),
  saveProgress: (id, positionSeconds, durationSeconds, audioTrackIndex, subtitleTrackIndex) =>
    api.post(`/video/${id}/progress`, { positionSeconds, durationSeconds, audioTrackIndex, subtitleTrackIndex })
};

export const syncApi = {
  getAndroidStatus: () => api.get('/sync/android/status'),
  getWindowsDiff: (deviceId, clientManifest) => api.post('/sync/windows/diff', { deviceId, clientManifest })
};

export const systemApi = {
  getStorage: () => api.get('/system/storage'),
  getStats: () => api.get('/system/stats')
};

export default api;
