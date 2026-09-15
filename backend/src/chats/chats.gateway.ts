import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatsService } from './chats.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtStrategy } from '../auth/jwt.strategy';
import { FileAccessService } from '../files/file-access.service';
import { allowedOrigins } from '../common/origins';

interface AuthSocket extends Socket {
  userId?: string;
  authReady?: Promise<void>;
}

// Simple in-memory rate limiter for WebSocket messages
const wsRateMap = new Map<string, number[]>();
const WS_RATE_LIMIT = 30; // max messages
const WS_RATE_WINDOW = 10_000; // per 10 seconds
const WS_RATE_CLEANUP_INTERVAL = 60_000; // cleanup every minute

function checkWsRate(userId: string): boolean {
  const now = Date.now();
  const timestamps = (wsRateMap.get(userId) || []).filter(t => now - t < WS_RATE_WINDOW);
  if (timestamps.length >= WS_RATE_LIMIT) return false;
  timestamps.push(now);
  wsRateMap.set(userId, timestamps);
  return true;
}

// Periodic cleanup of stale rate-limit entries to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of wsRateMap.entries()) {
    const fresh = timestamps.filter(t => now - t < WS_RATE_WINDOW);
    if (fresh.length === 0) wsRateMap.delete(userId);
    else wsRateMap.set(userId, fresh);
  }
}, WS_RATE_CLEANUP_INTERVAL).unref?.();

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => callback(null, !origin || allowedOrigins().includes(origin)),
    credentials: true,
  },
  namespace: '/',
})
export class ChatsGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  constructor(
    private jwtService: JwtService,
    private chatsService: ChatsService,
    private prisma: PrismaService,
    private strategy: JwtStrategy,
    private files: FileAccessService,
  ) {}

  handleConnection(client: AuthSocket) {
    client.authReady = (async () => {
      try {
        const origin = client.handshake.headers.origin;
        if (origin && !allowedOrigins().includes(origin)) throw new Error('Forbidden origin');
        const cookie = /(?:^|;\s*)access_token=([^;]+)/.exec(client.handshake.headers.cookie || '')?.[1];
        const token = client.handshake.auth?.token ||
          (client.handshake.headers.authorization || '').split(' ')[1] ||
          (cookie ? decodeURIComponent(cookie) : undefined);
        if (typeof token !== 'string') throw new Error('Missing credential');
        client.data.accessToken = token;
        const user = await this.authenticate(client);
        client.userId = user.id;
        const payload = this.jwtService.verify(token, { algorithms: ['HS256'] });
        const expiry = setTimeout(() => client.disconnect(true), Math.max(0, payload.exp * 1000 - Date.now()));
        expiry.unref?.();
        client.once('disconnect', () => clearTimeout(expiry));
      } catch { client.disconnect(true); }
    })();
  }

  private async authenticate(client: { data: Record<string, any> }) {
    const payload = this.jwtService.verify(client.data.accessToken, { algorithms: ['HS256'] });
    return this.strategy.validate(payload);
  }

  private async activeUser(client: AuthSocket) {
    await client.authReady;
    try { return await this.authenticate(client); }
    catch { client.disconnect(true); return null; }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(@MessageBody() chatId: string, @ConnectedSocket() client: AuthSocket) {
    const user = await this.activeUser(client);
    const userId = user?.id;
    if (!userId) { client.emit('error', 'unauthorized'); return; }

    // Verify user is a participant of this chat
    const participant = await this.prisma.chatParticipant.findUnique({
      where: { chatRoomId_userId: { chatRoomId: chatId, userId } },
    });
    if (!participant) {
      client.emit('error', 'forbidden');
      return;
    }

    client.join(chatId);
    return { event: 'joined', data: chatId };
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { chatId: string; text: string; attachments?: string[] },
    @ConnectedSocket() client: AuthSocket,
  ) {
    const user = await this.activeUser(client);
    const userId = user?.id;
    if (!userId) { client.emit('error', 'unauthorized'); return; }

    // Rate limiting
    if (!checkWsRate(userId)) {
      client.emit('error', 'rate_limited');
      return;
    }

    // Verify user is a participant of this chat
    const participant = await this.prisma.chatParticipant.findUnique({
      where: { chatRoomId_userId: { chatRoomId: data.chatId, userId } },
    });
    if (!participant) {
      client.emit('error', 'forbidden');
      return;
    }

    try { await this.files.assertCanAttach(data.attachments, user!); }
    catch { client.emit('error', 'forbidden'); return; }
    const message = await this.chatsService.sendMessage(
      data.chatId, { text: data.text, attachments: data.attachments }, userId,
    );
    await this.notifyNewMessage(data.chatId, message);
    return message;
  }

  /** Broadcast a freshly persisted message to all sockets joined to the chat room.
   *  Called by the REST controller after a synchronous POST so realtime works regardless of transport. */
  async notifyNewMessage(chatId: string, message: unknown) {
    // Revalidate receivers too: a blocked user must not keep receiving chat data.
    const clients = await this.server.in(chatId).fetchSockets();
    await Promise.all(clients.map(async client => {
      try {
        const user = await this.authenticate(client);
        const member = await this.prisma.chatParticipant.findUnique({
          where: { chatRoomId_userId: { chatRoomId: chatId, userId: user.id } },
        });
        if (member) client.emit('newMessage', message);
        else await client.leave(chatId);
      } catch { client.disconnect(true); }
    }));
  }
}
