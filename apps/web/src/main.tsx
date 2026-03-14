import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App.js';
import { Toaster } from '@/components/ui/toaster';
import '@/styles/globals.css';

// Remove loading spinner in index.html if present
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found. Check index.html.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
    <Toaster />
  </React.StrictMode>,
);
