// web/src/services/socket.js
import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem('nexora_token');
    if (token) {
      socket = io('/', {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000
      });

      socket.on('connect', () => {
        console.log('[WebSocket] Connected with ID:', socket.id);
      });

      socket.on('connect_error', (err) => {
        console.warn('[WebSocket] Connection error:', err.message);
      });
    }
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
