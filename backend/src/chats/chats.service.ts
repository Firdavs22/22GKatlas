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

  async getAvailableStaff(userId: string) {
    // Find the parent's children → their groups → the group teachers
    const childParents = await this.prisma.childParent.findMany({
      where: { parentId: userId },
      include: {
        child: {
          include: {
            group: {
              include: {
                teacher: { select: { id: true, name: true, role: true, avatar: true } },
              },
            },
          },
        },
      },
    });

    const staff: { id: string; name: string; role: string; avatar: string | null }[] = [];
    const seen = new Set<string>();

    for (const cp of childParents) {
      const teacher = cp.child?.group?.teacher;
      if (teacher && !seen.has(teacher.id)) {
        seen.add(teacher.id);
        staff.push(teacher);
      }
    }

    return staff;
  }

  async createOrGetChat(targetUserId: string, type: string, currentUserId: string) {
    // Check if chat already exists between these two users
    const existing = await this.prisma.chatRoom.findFirst({
      where: {
        participants: { every: { userId: { in: [currentUserId, targetUserId] } } },
        AND: [
          { participants: { some: { userId: currentUserId } } },
          { participants: { some: { userId: targetUserId } } },
        ],
      },
      include: {
        participants: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: { select: { id: true, name: true } } } },
      },
    });
    if (existing) return existing;

    // Create new chat room
    return this.prisma.chatRoom.create({
      data: {
        type: type as any,
        participants: {
          create: [
            { userId: currentUserId },
            { userId: targetUserId },
          ],
        },
      },
      include: {
        participants: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: { select: { id: true, name: true } } } },
      },
    });
  }
}
