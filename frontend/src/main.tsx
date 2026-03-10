import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import "./i18n/i18n";

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode> {/* useful to detect bugs in development */}
        <App />
    </React.StrictMode>
);