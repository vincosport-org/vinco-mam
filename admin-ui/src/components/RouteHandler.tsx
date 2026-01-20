import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function RouteHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Sync WordPress page parameter with React Router
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
      if (targetPath && location.pathname !== targetPath) {
        navigate(targetPath, { replace: true });
      }
    }
  }, [navigate, location]);

  // Also listen for URL changes from WordPress menu clicks
  useEffect(() => {
    const handleUrlChange = () => {
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
          navigate(targetPath, { replace: true });
        }
      }
    };

    // Listen for popstate events (back/forward button)
    window.addEventListener('popstate', handleUrlChange);
    
    // Also check on mount and after a short delay to catch menu clicks
    const timeoutId = setTimeout(handleUrlChange, 100);
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      clearTimeout(timeoutId);
    };
  }, [navigate]);

  return null;
}
