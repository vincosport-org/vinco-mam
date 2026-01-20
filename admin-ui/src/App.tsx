import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { useUserStore } from './stores/userStore';
import { WebSocketProvider } from './context/WebSocketContext';
import { KeyboardShortcutsProvider } from './context/KeyboardShortcutsContext';

import Layout from './components/Layout';
import Dashboard from './components/dashboard/Dashboard';
import Gallery from './components/gallery/Gallery';
import ImageEditor from './components/editor/ImageEditor';
import ValidationQueue from './components/validation/ValidationQueue';
import AthleteList from './components/athletes/AthleteList';
import AthleteDetail from './components/athletes/AthleteDetail';
import AlbumList from './components/albums/AlbumList';
import AlbumDetail from './components/albums/AlbumDetail';
import VideoList from './components/videos/VideoList';
import UserManagement from './components/users/UserManagement';
import Settings from './components/settings/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 2,
    },
  },
});

// Declare global types for WordPress
declare global {
  interface Window {
    vincoMAM?: {
      apiRoot: string;
      nonce: string;
      settings: any;
      user: any;
      currentPage: string;
    };
  }
}

export default function App() {
  const { user, capabilities } = useUserStore();
  
  // Initialize user store from WordPress data
  useEffect(() => {
    if (window.vincoMAM?.user) {
      useUserStore.getState().setUser(window.vincoMAM.user);
      useUserStore.getState().setCapabilities(window.vincoMAM.user.capabilities || []);
    }
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
        <KeyboardShortcutsProvider>
          <BrowserRouter basename="/wp-admin/admin.php">
            <Layout>
              <Routes>
                {/* Dashboard */}
                <Route path="/" element={<Navigate to="/page=vinco-mam" replace />} />
                <Route path="/page=vinco-mam" element={<Dashboard />} />
                
                {/* Gallery */}
                <Route path="/page=vinco-mam-gallery" element={<Gallery />} />
                <Route path="/page=vinco-mam-gallery/:imageId" element={<ImageEditor />} />
                
                {/* Validation */}
                {capabilities.includes('validateRecognition') && (
                  <Route path="/page=vinco-mam-validation" element={<ValidationQueue />} />
                )}
                
                {/* Athletes */}
                <Route path="/page=vinco-mam-athletes" element={<AthleteList />} />
                <Route path="/page=vinco-mam-athletes/:athleteId" element={<AthleteDetail />} />
                
                {/* Albums */}
                <Route path="/page=vinco-mam-albums" element={<AlbumList />} />
                <Route path="/page=vinco-mam-albums/:albumId" element={<AlbumDetail />} />
                
                {/* Videos */}
                <Route path="/page=vinco-mam-videos" element={<VideoList />} />
                
                {/* Admin */}
                {capabilities.includes('manageUsers') && (
                  <Route path="/page=vinco-mam-users" element={<UserManagement />} />
                )}
                {capabilities.includes('manageSettings') && (
                  <Route path="/page=vinco-mam-settings" element={<Settings />} />
                )}
              </Routes>
            </Layout>
          </BrowserRouter>
          <Toaster position="bottom-right" />
        </KeyboardShortcutsProvider>
      </WebSocketProvider>
    </QueryClientProvider>
  );
}
