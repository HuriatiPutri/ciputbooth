import { Server } from 'socket.io';

let io;

export function initSocket(server) {
  if (!io) {
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
        console.log('⚡ Received remote action from socket:', socket.id, data);
        // Forward the action to display room and broadcast to all connected clients
        io.to('display').emit('kiosk_action', data);
        socket.broadcast.emit('kiosk_action', data);
      });

      socket.on('disconnect', () => {
        console.log('❌ Socket disconnected:', socket.id);
      });
    });
  } else if (server) {
    // Attach additional server (e.g. HTTP alongside HTTPS)
    io.attach(server);
  }

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.io is not initialized');
  }
  return io;
}
