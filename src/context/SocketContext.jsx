import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Determine the base URL (handles both dev and prod in electron/browser)
    let baseUrl = window.location.origin;
    const hostname = window.location.hostname || 'localhost';

    if (window.location.protocol === 'file:' || window.location.port === '5174' || window.location.port === '5173') {
      // In dev mode with Vite on 5173/5174, socket connects to backend server on the SAME host
      const isHttps = window.location.protocol === 'https:';
      const backendPort = isHttps ? 3001 : 3002;
      baseUrl = `${window.location.protocol}//${hostname}:${backendPort}`;
    }

    const newSocket = io(baseUrl, {
      transports: ['websocket', 'polling'],
      rejectUnauthorized: false
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Connected to socket server at', baseUrl);
      const isRemote = new URLSearchParams(window.location.search).get('mode') === 'remote';
      if (isRemote) {
        newSocket.emit('join_remote');
      } else {
        newSocket.emit('join_display');
      }
    });

    return () => newSocket.close();
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
