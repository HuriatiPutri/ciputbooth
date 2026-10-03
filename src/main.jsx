import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { BoothProvider } from './context/BoothContext';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <SocketProvider>
          <BoothProvider>
            <App />
          </BoothProvider>
        </SocketProvider>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
