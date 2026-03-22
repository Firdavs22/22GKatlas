import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatsService {
  constructor(private prisma: PrismaService) {}

  getChatsForUser(userId: string) {
    return this.prisma.chatRoom.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, name: true } } },
        },
      },
    });
  }

  async getMessages(chatId: string, userId: string) {
    await this.checkAccess(chatId, userId);
    await this.prisma.chatParticipant.update({
      where: { chatRoomId_userId: { chatRoomId: chatId, userId } },
      data: { lastReadAt: new Date() },
    });
    return this.prisma.chatMessage.findMany({
      where: { chatRoomId: chatId },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(chatId: string, dto: { text: string; attachments?: string[] }, userId: string) {
    await this.checkAccess(chatId, userId);
    return this.prisma.chatMessage.create({
      data: {
        chatRoomId: chatId,
        senderId: userId,
        text: dto.text,
        attachments: dto.attachments || [],
      },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
    });
  }

  private async checkAccess(chatId: string, userId: string) {
    const participant = await this.prisma.chatParticipant.findUnique({
      where: { chatRoomId_userId: { chatRoomId: chatId, userId } },
    });
    if (!participant) throw new ForbiddenException();
  }
}
