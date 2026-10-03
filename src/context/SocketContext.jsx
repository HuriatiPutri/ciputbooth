import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Determine the base URL (handles both dev and prod in electron/browser)
    let baseUrl = window.location.origin;
    if (window.location.protocol === 'file:' || baseUrl.includes('localhost:5174')) {
      // In dev mode or file protocol, default to port 37192 or 3001
      baseUrl = 'http://localhost:37192';
    }

    const newSocket = io(baseUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
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
