import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [canManageSettings, setCanManageSettings] = useState(false);
  
  useEffect(() => {
    const canManage = typeof window !== 'undefined' && 
      window.vincoMAM?.user?.capabilities?.includes('manageSettings');
    setCanManageSettings(!!canManage);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, page: string, path: string) => {
    e.preventDefault();
    navigate(path);
    // Update WordPress URL without reload
    const newUrl = window.location.pathname + '?page=' + page;
    window.history.pushState({ page }, '', newUrl);
    // Trigger RouteHandler to sync
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const getCurrentPage = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('page') || '';
  };

  const isActive = (page: string, path: string) => {
    const currentPage = getCurrentPage();
    return currentPage === page || location.pathname === path || 
           (path !== '/' && location.pathname.startsWith(path));
  };
  
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Vinco MAM
          </h1>
        </div>
        
        <nav className="mt-4">
          <a
            href={window.location.pathname + '?page=vinco-mam'}
            className={`block px-4 py-2 ${
              isActive('vinco-mam', '/')
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            onClick={(e) => handleNavClick(e, 'vinco-mam', '/')}
          >
            Dashboard
          </a>
          <a
            href={window.location.pathname + '?page=vinco-mam-gallery'}
            className={`block px-4 py-2 ${
              isActive('vinco-mam-gallery', '/gallery')
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            onClick={(e) => handleNavClick(e, 'vinco-mam-gallery', '/gallery')}
          >
            Gallery
          </a>
          <a
            href={window.location.pathname + '?page=vinco-mam-validation'}
            className={`block px-4 py-2 ${
              isActive('vinco-mam-validation', '/validation')
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            onClick={(e) => handleNavClick(e, 'vinco-mam-validation', '/validation')}
          >
            Validation
          </a>
          <a
            href={window.location.pathname + '?page=vinco-mam-athletes'}
            className={`block px-4 py-2 ${
              isActive('vinco-mam-athletes', '/athletes')
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            onClick={(e) => handleNavClick(e, 'vinco-mam-athletes', '/athletes')}
          >
            Athletes
          </a>
          <a
            href={window.location.pathname + '?page=vinco-mam-albums'}
            className={`block px-4 py-2 ${
              isActive('vinco-mam-albums', '/albums')
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            onClick={(e) => handleNavClick(e, 'vinco-mam-albums', '/albums')}
          >
            Albums
          </a>
          <a
            href={window.location.pathname + '?page=vinco-mam-videos'}
            className={`block px-4 py-2 ${
              isActive('vinco-mam-videos', '/videos')
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            onClick={(e) => handleNavClick(e, 'vinco-mam-videos', '/videos')}
          >
            Videos
          </a>
          {canManageSettings && (
            <a
              href={window.location.pathname + '?page=vinco-mam-settings'}
              className={`block px-4 py-2 ${
                isActive('vinco-mam-settings', '/settings')
                  ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={(e) => handleNavClick(e, 'vinco-mam-settings', '/settings')}
            >
              Settings
            </a>
          )}
        </nav>
      </aside>
      
      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
