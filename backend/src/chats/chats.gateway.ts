import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatsService } from './chats.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class ChatsGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  constructor(
    private jwtService: JwtService,
    private chatsService: ChatsService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        (client.handshake.headers.authorization || '').split(' ')[1];
      if (!token) { client.disconnect(); return; }
      const payload = this.jwtService.verify(token);
      (client as any).userId = payload.sub;
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@MessageBody() chatId: string, @ConnectedSocket() client: Socket) {
    client.join(chatId);
    return { event: 'joined', data: chatId };
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { chatId: string; text: string; attachments?: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = (client as any).userId;
    if (!userId) return;
    const message = await this.chatsService.sendMessage(
      data.chatId, { text: data.text, attachments: data.attachments }, userId,
    );
    this.server.to(data.chatId).emit('newMessage', message);
    return message;
  }
}
