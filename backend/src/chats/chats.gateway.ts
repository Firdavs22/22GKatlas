import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatsService } from './chats.service';
import { PrismaService } from '../prisma/prisma.service';

interface AuthSocket extends Socket {
  userId?: string;
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
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:3000'],
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
  ) {}

  handleConnection(client: AuthSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        (client.handshake.headers.authorization || '').split(' ')[1];
      if (!token) { client.disconnect(); return; }
      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(@MessageBody() chatId: string, @ConnectedSocket() client: AuthSocket) {
    const userId = client.userId;
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
    const userId = client.userId;
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

    const message = await this.chatsService.sendMessage(
      data.chatId, { text: data.text, attachments: data.attachments }, userId,
    );
    this.notifyNewMessage(data.chatId, message);
    return message;
  }

  /** Broadcast a freshly persisted message to all sockets joined to the chat room.
   *  Called by the REST controller after a synchronous POST so realtime works regardless of transport. */
  notifyNewMessage(chatId: string, message: unknown) {
    this.server.to(chatId).emit('newMessage', message);
  }
}
