import { io, Socket } from 'socket.io-client';
import { getToken } from './auth';
import api, { API_URL } from './api';

let socket: Socket | null = null;
let connecting: Promise<Socket | null> | null = null;

/**
 * Один общий socket для всего приложения.
 * Подключается лениво при первом вызове, реконнектит автоматически.
 * Auth — JWT в handshake.
 */
export async function getSocket(): Promise<Socket | null> {
  if (socket?.connected) return socket;
  if (connecting) return connecting;

  connecting = (async () => {
    const token = await getToken();
    if (!token) {
      connecting = null;
      return null;
    }
    // Закрыть старый, если был
    if (socket) {
      try { socket.removeAllListeners(); socket.disconnect(); } catch {}
    }
    socket = io(API_URL, {
      auth: callback => { getToken().then(current => callback({ token: current })); },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    const currentSocket = socket;
    socket.on('disconnect', reason => {
      if (reason === 'io server disconnect') {
        api.get('/me').then(() => { if (socket === currentSocket) currentSocket.connect(); }).catch(() => {});
      }
    });
    connecting = null;
    return socket;
  })();

  return connecting;
}

export function disconnectSocket() {
  if (socket) {
    try { socket.removeAllListeners(); socket.disconnect(); } catch {}
    socket = null;
  }
}
