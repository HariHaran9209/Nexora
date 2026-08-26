// web/src/context/DriveContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { filesApi, uploadApi, systemApi } from '../services/api';
import { ChunkUploader } from '../services/chunkUploader';
import { getSocket } from '../services/socket';

const DriveContext = createContext(null);

export const DriveProvider = ({ children }) => {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Drive' }]);
  const [pagination, setPagination] = useState({ page: 1, limit: 100, totalFiles: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);

  // Filters & State
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('nexora_drive_view') || 'grid'); // 'grid' | 'list'
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Storage Stats (500GB HDD meter)
  const [storageInfo, setStorageInfo] = useState(null);

  // Upload Queue: array of { id, file, status, progress, uploader }
  const [uploadQueue, setUploadQueue] = useState([]);

  // Fetch Storage
  const refreshStorage = useCallback(async () => {
    try {
      const res = await systemApi.getStorage();
      setStorageInfo(res.data.data);
    } catch (err) {
      console.warn('Could not fetch storage stats:', err.message);
    }
  }, []);

  // Fetch Directory Files
  const fetchFiles = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const queryParams = {
        folderId: params.folderId !== undefined ? params.folderId : currentFolderId,
        category: params.category !== undefined ? params.category : activeCategory,
        search: params.search !== undefined ? params.search : searchQuery,
        sortBy: params.sortBy || sortBy,
        sortOrder: params.sortOrder || sortOrder,
        isTrash: params.isTrash || 'false',
        isFavorite: params.isFavorite,
        page: params.page || 1,
        limit: params.limit || 100
      };

      const res = await filesApi.getFiles(queryParams);
      const data = res.data.data;
      setFiles(data.files || []);
      setFolders(data.folders || []);
      setCurrentFolder(data.currentFolder || null);
      setBreadcrumbs(data.breadcrumbs || [{ id: null, name: 'Drive' }]);
      setPagination(data.pagination || { page: 1, limit: 100, totalFiles: 0, totalPages: 1 });
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, activeCategory, searchQuery, sortBy, sortOrder]);

  // Initial load & socket listeners
  useEffect(() => {
    fetchFiles();
    refreshStorage();

    const socket = getSocket();
    if (socket) {
      socket.on('file:refresh', () => {
        fetchFiles();
        refreshStorage();
      });
    }

    return () => {
      if (socket) {
        socket.off('file:refresh');
      }
    };
  }, [fetchFiles, refreshStorage]);

  // Set View Mode
  const toggleViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('nexora_drive_view', mode);
  };

  // Upload Handlers (Handles small single uploads & large chunked resumable uploads)
  const enqueueUploads = (fileList, targetFolderId = currentFolderId) => {
    const newItems = Array.from(fileList).map((file) => ({
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      size: file.size,
      status: 'pending', // pending, uploading, processing, completed, error
      progress: 0,
      targetFolderId
    }));

    setUploadQueue((prev) => [...prev, ...newItems]);

    // Process each upload asynchronously
    newItems.forEach(async (item) => {
      try {
        if (item.file.size > 15 * 1024 * 1024) {
          // Large file (>15MB): Use Resumable Chunked Uploader
          const uploader = new ChunkUploader(item.file, {
            parentFolderId: item.targetFolderId,
            onProgress: (p) => {
              setUploadQueue((q) =>
                q.map((qi) => (qi.id === item.id ? { ...qi, progress: p.percent, status: 'uploading' } : qi))
              );
            },
            onStatusChange: (status) => {
              setUploadQueue((q) =>
                q.map((qi) => (qi.id === item.id ? { ...qi, status } : qi))
              );
            }
          });

          await uploader.start();
        } else {
          // Small file: Single upload
          setUploadQueue((q) =>
            q.map((qi) => (qi.id === item.id ? { ...qi, status: 'uploading' } : qi))
          );

          const formData = new FormData();
          formData.append('file', item.file);
          if (item.targetFolderId) formData.append('parentFolderId', item.targetFolderId);

          await uploadApi.uploadSingle(formData, (e) => {
            const percent = Math.round((e.loaded * 100) / e.total);
            setUploadQueue((q) =>
              q.map((qi) => (qi.id === item.id ? { ...qi, progress: percent } : qi))
            );
          });
        }

        // Mark completed
        setUploadQueue((q) =>
          q.map((qi) => (qi.id === item.id ? { ...qi, progress: 100, status: 'completed' } : qi))
        );
        fetchFiles();
        refreshStorage();
      } catch (err) {
        console.error(`Upload error for ${item.name}:`, err);
        setUploadQueue((q) =>
          q.map((qi) => (qi.id === item.id ? { ...qi, status: 'error', error: err.message } : qi))
        );
      }
    });
  };

  const createFolder = async (name) => {
    try {
      const res = await filesApi.createFolder(name, currentFolderId);
      setFolders((prev) => [...prev, res.data.data]);
      return res.data.data;
    } catch (err) {
      throw err;
    }
  };

  const renameItem = async (id, newName, isFolder) => {
    try {
      await filesApi.renameItem(id, newName, isFolder);
      if (isFolder) {
        setFolders((prev) => prev.map((f) => (f._id === id ? { ...f, name: newName } : f)));
      } else {
        setFiles((prev) => prev.map((f) => (f._id === id ? { ...f, name: newName } : f)));
      }
    } catch (err) {
      throw err;
    }
  };

  const moveItem = async (id, targetFolderId, isFolder) => {
    try {
      await filesApi.moveItem(id, targetFolderId, isFolder);
      fetchFiles();
    } catch (err) {
      throw err;
    }
  };

  const deleteItem = async (id, isFolder, permanent = false) => {
    try {
      await filesApi.deleteItem(id, isFolder, permanent);
      if (isFolder) {
        setFolders((prev) => prev.filter((f) => f._id !== id));
      } else {
        setFiles((prev) => prev.filter((f) => f._id !== id));
      }
      refreshStorage();
    } catch (err) {
      throw err;
    }
  };

  const toggleFavorite = async (id) => {
    try {
      // Optimistic update
      setFiles((prev) =>
        prev.map((f) => (f._id === id ? { ...f, isFavorite: !f.isFavorite } : f))
      );
      await filesApi.toggleFavorite(id);
    } catch (err) {
      fetchFiles(); // Revert on failure
    }
  };

  const clearCompletedUploads = () => {
    setUploadQueue((prev) => prev.filter((item) => item.status !== 'completed'));
  };

  return (
    <DriveContext.Provider
      value={{
        files,
        folders,
        currentFolder,
        currentFolderId,
        setCurrentFolderId,
        breadcrumbs,
        pagination,
        loading,
        viewMode,
        toggleViewMode,
        activeCategory,
        setActiveCategory,
        searchQuery,
        setSearchQuery,
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder,
        storageInfo,
        uploadQueue,
        enqueueUploads,
        createFolder,
        renameItem,
        moveItem,
        deleteItem,
        toggleFavorite,
        fetchFiles,
        refreshStorage,
        clearCompletedUploads
      }}
    >
      {children}
    </DriveContext.Provider>
  );
};

export const useDrive = () => {
  const context = useContext(DriveContext);
  if (!context) {
    throw new Error('useDrive must be used within a DriveProvider');
  }
  return context;
};
