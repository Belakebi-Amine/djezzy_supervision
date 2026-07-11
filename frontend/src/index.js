// index.js
// ─────────────────────────────────────────────────────────────
// Entry point for the React application. Renders the App
// component inside StrictMode for additional development checks.
// ─────────────────────────────────────────────────────────────
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
