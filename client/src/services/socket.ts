import { io, Socket } from 'socket.io-client';

// Use same host or explicit port
const SOCKET_URL = import.meta.env.VITE_API_URL || (window.location.port === '5173' ? 'http://localhost:5000' : '/');

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});
