import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function RouteHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Sync WordPress page parameter with React Router hash
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page') || window.vincoMAM?.currentPage;
    
    if (pageParam) {
      const pageMap: Record<string, string> = {
        'vinco-mam': '/',
        'vinco-mam-gallery': '/gallery',
        'vinco-mam-validation': '/validation',
        'vinco-mam-athletes': '/athletes',
        'vinco-mam-albums': '/albums',
        'vinco-mam-videos': '/videos',
        'vinco-mam-users': '/users',
        'vinco-mam-settings': '/settings',
      };
      
      const targetPath = pageMap[pageParam];
      if (targetPath) {
        // Check if hash matches target path
        const currentHash = window.location.hash.slice(1) || '/';
        if (currentHash !== targetPath) {
          // Update hash which will trigger React Router navigation
          window.location.hash = targetPath;
          // Also navigate with React Router
          navigate(targetPath, { replace: true });
        }
      }
    }
  }, [navigate, location]);

  // Listen for hash changes from WordPress menu clicks
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || '/';
      if (location.pathname !== hash) {
        navigate(hash, { replace: true });
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [navigate, location]);

  // Also listen for URL query parameter changes (WordPress menu navigation)
  useEffect(() => {
    const checkUrl = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const pageParam = urlParams.get('page');
      
      if (pageParam) {
        const pageMap: Record<string, string> = {
          'vinco-mam': '/',
          'vinco-mam-gallery': '/gallery',
          'vinco-mam-validation': '/validation',
          'vinco-mam-athletes': '/athletes',
          'vinco-mam-albums': '/albums',
          'vinco-mam-videos': '/videos',
          'vinco-mam-users': '/users',
          'vinco-mam-settings': '/settings',
        };
        
        const targetPath = pageMap[pageParam];
        if (targetPath) {
          const currentHash = window.location.hash.slice(1) || '/';
          if (currentHash !== targetPath) {
            window.location.hash = targetPath;
          }
        }
      }
    };

    // Check on mount
    checkUrl();

    // Use MutationObserver to watch for URL changes
    let lastUrl = window.location.href;
    const observer = new MutationObserver(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        checkUrl();
      }
    });

    observer.observe(document, { subtree: true, childList: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
