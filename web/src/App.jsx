// web/src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DriveProvider } from './context/DriveContext';
import { PlayerProvider } from './context/PlayerContext';

import { Sidebar } from './components/common/Sidebar';
import { TopNav } from './components/common/TopNav';
import { MobileNav } from './components/common/MobileNav';
import { MusicPlayerBar } from './components/music/MusicPlayerBar';
import { QueueDrawer } from './components/music/QueueDrawer';
import { NowPlayingModal } from './components/music/NowPlayingModal';
import { usePlayer } from './context/PlayerContext';

import { DrivePage } from './pages/DrivePage';
import { MusicPage } from './pages/MusicPage';
import { VideoPage } from './pages/VideoPage';
import { SyncPage } from './pages/SyncPage';
import { LoginPage } from './pages/LoginPage';

// Layout Shell for Authenticated Screens
const AppLayout = () => {
  const [newFolderTrigger, setNewFolderTrigger] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { currentTrack } = usePlayer();

  return (
    <div className="flex h-screen h-[100dvh] w-screen bg-[#09090b] overflow-hidden">
      {/* Spotify Sidebar (Fixed on desktop, slide-over drawer on mobile) */}
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopNav
          onNewFolder={() => setNewFolderTrigger((prev) => !prev)}
          onOpenSidebar={() => setIsMobileSidebarOpen(true)}
        />
        
        {/* Dynamic Screen View with Responsive Safe Padding */}
        <main
          className={`flex-1 overflow-hidden relative ${
            currentTrack ? 'pb-28 md:pb-20' : 'pb-14 md:pb-0'
          }`}
        >
          <Outlet context={{ newFolderTrigger }} />
        </main>
      </div>

      {/* Persistent Spotify Bottom Player Bar (Floating mini-bar on mobile, full bar on desktop) */}
      <MusicPlayerBar />

      {/* Mobile Bottom Navigation Bar (< md screens) */}
      <MobileNav onOpenSidebar={() => setIsMobileSidebarOpen(true)} />

      {/* Slide-out Play Queue Drawer */}
      <QueueDrawer />

      {/* Fullscreen Now Playing Visualizer Modal */}
      <NowPlayingModal />
    </div>
  );
};

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DriveProvider>
          <PlayerProvider>
            <Routes>
              {/* Public Auth Route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected App Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DrivePage />} />
                <Route path="music" element={<MusicPage />} />
                <Route path="music/favorites" element={<MusicPage />} />
                <Route path="music/albums" element={<MusicPage />} />
                <Route path="video" element={<VideoPage />} />
                <Route path="sync" element={<SyncPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </PlayerProvider>
        </DriveProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
