import { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { useUserStore } from './stores/userStore';
import { WebSocketProvider } from './context/WebSocketContext';
import { KeyboardShortcutsProvider } from './context/KeyboardShortcutsContext';

import { ErrorBoundary } from './components/common/ErrorBoundary';
import Layout from './components/Layout';
import RouteHandler from './components/RouteHandler';
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
  const { capabilities } = useUserStore();
  
  // Initialize user store from WordPress data and handle routing
  useEffect(() => {
    if (window.vincoMAM?.user) {
      useUserStore.getState().setUser(window.vincoMAM.user);
      useUserStore.getState().setCapabilities(window.vincoMAM.user.capabilities || []);
    }
    
    // Handle WordPress page routing based on currentPage or URL params
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page') || window.vincoMAM?.currentPage;
    
    if (pageParam) {
      const pageMap: Record<string, string> = {
        'vinco-mam': '/gallery',
        'vinco-mam-validation': '/validation',
        'vinco-mam-athletes': '/athletes',
        'vinco-mam-albums': '/albums',
        'vinco-mam-videos': '/videos',
        'vinco-mam-users': '/users',
        'vinco-mam-settings': '/settings',
      };
      
      const targetPath = pageMap[pageParam];
      if (targetPath && window.location.hash !== '#' + targetPath) {
        // Use hash-based routing for React Router
        window.location.hash = targetPath;
      }
    }
  }, []);
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider>
          <KeyboardShortcutsProvider>
            <HashRouter>
              <Layout>
                <RouteHandler />
                <Routes>
                {/* Gallery is the main view */}
                <Route path="/" element={<Gallery />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/gallery/:imageId" element={<ImageEditor />} />
                
                {/* Validation - show to all, let component handle permission checks */}
                <Route path="/validation" element={<ValidationQueue />} />
                
                {/* Athletes */}
                <Route path="/athletes" element={<AthleteList />} />
                <Route path="/athletes/:athleteId" element={<AthleteDetail />} />
                
                {/* Albums */}
                <Route path="/albums" element={<AlbumList />} />
                <Route path="/albums/:albumId" element={<AlbumDetail />} />
                
                {/* Videos */}
                <Route path="/videos" element={<VideoList />} />
                
                {/* Admin - show to all, let components handle permission checks */}
                <Route path="/users" element={<UserManagement />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Layout>
          </HashRouter>
          <Toaster position="bottom-right" />
        </KeyboardShortcutsProvider>
      </WebSocketProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}
