import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Mount to WordPress container
const rootElement = document.getElementById('vinco-mam-root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} else {
  // Debug: log if root element not found
  console.error('Vinco MAM: Root element #vinco-mam-root not found in DOM');
}
