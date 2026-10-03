import { Server } from 'socket.io';

let io;

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('🔗 New socket connected:', socket.id);

    // Kiosk display client will join the 'display' room
    socket.on('join_display', () => {
      socket.join('display');
      console.log('🖥️ Socket joined display room:', socket.id);
    });

    // Remote remote client will join the 'remote' room
    socket.on('join_remote', () => {
      socket.join('remote');
      console.log('📱 Socket joined remote room:', socket.id);
    });

    // Remote client sends an action to the display
    socket.on('remote_action', (data) => {
      // Forward the action to the display client(s)
      io.to('display').emit('kiosk_action', data);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected:', socket.id);
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.io is not initialized');
  }
  return io;
}
