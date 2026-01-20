import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  
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
            to="/page=vinco-mam"
            className={`block px-4 py-2 ${
              location.pathname === '/page=vinco-mam'
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/page=vinco-mam-gallery"
            className={`block px-4 py-2 ${
              location.pathname.startsWith('/page=vinco-mam-gallery')
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Gallery
          </Link>
          <Link
            to="/page=vinco-mam-validation"
            className={`block px-4 py-2 ${
              location.pathname === '/page=vinco-mam-validation'
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Validation
          </Link>
          <Link
            to="/page=vinco-mam-athletes"
            className={`block px-4 py-2 ${
              location.pathname.startsWith('/page=vinco-mam-athletes')
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Athletes
          </Link>
          <Link
            to="/page=vinco-mam-albums"
            className={`block px-4 py-2 ${
              location.pathname.startsWith('/page=vinco-mam-albums')
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Albums
          </Link>
          <Link
            to="/page=vinco-mam-videos"
            className={`block px-4 py-2 ${
              location.pathname === '/page=vinco-mam-videos'
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Videos
          </Link>
        </nav>
      </aside>
      
      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
