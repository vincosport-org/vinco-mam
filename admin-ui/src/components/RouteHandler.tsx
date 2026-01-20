import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function RouteHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Sync WordPress page parameter with React Router
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
      if (targetPath && location.pathname !== targetPath) {
        navigate(targetPath, { replace: true });
      }
    }
  }, [navigate, location]);

  return null;
}
