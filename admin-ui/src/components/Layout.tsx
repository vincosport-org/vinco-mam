import React, { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [canManageSettings, setCanManageSettings] = useState(false);
  
  useEffect(() => {
    const canManage = typeof window !== 'undefined' && 
      window.vincoMAM?.user?.capabilities?.includes('manageSettings');
    setCanManageSettings(!!canManage);
  }, []);
  
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
          <Link
            to="/"
            className={`block px-4 py-2 ${
              location.pathname === '/' || location.pathname === '/page=vinco-mam'
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/gallery"
            className={`block px-4 py-2 ${
              location.pathname.startsWith('/gallery')
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Gallery
          </Link>
          <Link
            to="/validation"
            className={`block px-4 py-2 ${
              location.pathname.startsWith('/validation')
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Validation
          </Link>
          <Link
            to="/athletes"
            className={`block px-4 py-2 ${
              location.pathname.startsWith('/athletes')
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Athletes
          </Link>
          <Link
            to="/albums"
            className={`block px-4 py-2 ${
              location.pathname.startsWith('/albums')
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Albums
          </Link>
          <Link
            to="/videos"
            className={`block px-4 py-2 ${
              location.pathname.startsWith('/videos')
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Videos
          </Link>
          {canManageSettings && (
            <Link
              to="/settings"
              className={`block px-4 py-2 ${
                location.pathname.startsWith('/settings')
                  ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Settings
            </Link>
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
