// This file uses JSX syntax. If you encounter Vite import-analysis errors, rename this file to main.jsx.
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './style.css';

createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
