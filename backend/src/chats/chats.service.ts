import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatsService {
  constructor(private prisma: PrismaService) {}

  async getChatsForUser(userId: string) {
    const rooms = await this.prisma.chatRoom.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: { include: { user: { select: { id: true, name: true, role: true, avatar: true } } } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, name: true } } },
        },
      },
    });

    return Promise.all(
      rooms.map(async room => {
        const me = room.participants.find(p => p.userId === userId);
        const lastReadAt = me?.lastReadAt;
        const unreadCount = await this.prisma.chatMessage.count({
          where: {
            chatRoomId: room.id,
            senderId: { not: userId },
            ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
          },
        });
        return { ...room, unreadCount };
      }),
    );
  }

  async getUnreadTotal(userId: string) {
    const participants = await this.prisma.chatParticipant.findMany({
      where: { userId },
      select: { chatRoomId: true, lastReadAt: true },
    });
    let total = 0;
    for (const p of participants) {
      const count = await this.prisma.chatMessage.count({
        where: {
          chatRoomId: p.chatRoomId,
          senderId: { not: userId },
          ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
        },
      });
      total += count;
    }
    return { total };
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

  async getAvailableStaff(user: { id: string; role: string }) {
    if (user.role === 'parent') return this.getStaffForParent(user.id);
    if (user.role === 'pediatrician' || user.role === 'psychologist') {
      return this.getContactsForSpecialist(user.id, user.role);
    }
    if (user.role === 'teacher') return this.getContactsForTeacher(user.id);
    return [];
  }

  private async getStaffForParent(parentId: string) {
    // Children of this parent → their teachers + specialists
    const childParents = await this.prisma.childParent.findMany({
      where: { parentId },
      include: {
        child: {
          include: {
            group: {
              include: {
                teacher: { select: { id: true, name: true, role: true, avatar: true } },
              },
            },
            specialists: {
              include: {
                specialist: { select: { id: true, name: true, role: true, avatar: true } },
              },
            },
          },
        },
      },
    });

    type StaffEntry = { id: string; name: string; role: string; avatar: string | null; child?: string };
    const staff: StaffEntry[] = [];
    const seen = new Set<string>();

    const pushOnce = (u: StaffEntry | null | undefined) => {
      if (!u || seen.has(u.id)) return;
      seen.add(u.id);
      staff.push(u);
    };

    for (const cp of childParents) {
      const childName = cp.child?.name;
      const teacher = cp.child?.group?.teacher;
      if (teacher) pushOnce({ ...teacher, child: childName });
      for (const link of cp.child?.specialists || []) {
        if (link.specialist) pushOnce({ ...link.specialist, child: childName });
      }
    }

    // Always allow chatting with any active pediatrician/psychologist of the school
    // (so parents can reach them even before being officially linked).
    const fallbackSpecialists = await this.prisma.user.findMany({
      where: { role: { in: ['pediatrician', 'psychologist'] } },
      select: { id: true, name: true, role: true, avatar: true },
    });
    for (const s of fallbackSpecialists) pushOnce(s);

    return staff;
  }

  private async getContactsForSpecialist(specialistId: string, role: string) {
    // Specialist (pediatrician/psychologist) can chat with parents of the children
    // they are assigned to, and with teachers of those children's groups.
    const links = await this.prisma.childSpecialist.findMany({
      where: { specialistId },
      include: {
        child: {
          include: {
            group: {
              include: { teacher: { select: { id: true, name: true, role: true, avatar: true } } },
            },
            parents: {
              include: { parent: { select: { id: true, name: true, role: true, avatar: true } } },
            },
          },
        },
      },
    });

    type Entry = { id: string; name: string; role: string; avatar: string | null; child?: string };
    const out: Entry[] = [];
    const seen = new Set<string>();
    const pushOnce = (u: Entry | null | undefined) => {
      if (!u || seen.has(u.id)) return;
      seen.add(u.id);
      out.push(u);
    };

    for (const link of links) {
      const childName = link.child?.name;
      const teacher = link.child?.group?.teacher;
      if (teacher) pushOnce({ ...teacher, child: childName });
      for (const parentLink of link.child?.parents || []) {
        if (parentLink.parent) pushOnce({ ...parentLink.parent, child: childName });
      }
    }

    // Mark role usage for caller-side filtering
    void role;
    return out;
  }

  private async getContactsForTeacher(teacherId: string) {
    // Teacher can chat with parents of children in their group and with specialists
    // attached to those children.
    const group = await this.prisma.group.findFirst({
      where: { teacherId },
      include: {
        children: {
          include: {
            parents: {
              include: { parent: { select: { id: true, name: true, role: true, avatar: true } } },
            },
            specialists: {
              include: { specialist: { select: { id: true, name: true, role: true, avatar: true } } },
            },
          },
        },
      },
    });

    type Entry = { id: string; name: string; role: string; avatar: string | null; child?: string };
    const out: Entry[] = [];
    const seen = new Set<string>();
    const pushOnce = (u: Entry | null | undefined) => {
      if (!u || seen.has(u.id)) return;
      seen.add(u.id);
      out.push(u);
    };

    for (const child of group?.children || []) {
      for (const parentLink of child.parents || []) {
        if (parentLink.parent) pushOnce({ ...parentLink.parent, child: child.name });
      }
      for (const specLink of child.specialists || []) {
        if (specLink.specialist) pushOnce({ ...specLink.specialist, child: child.name });
      }
    }
    return out;
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
        participants: { include: { user: { select: { id: true, name: true, role: true, avatar: true } } } },
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
        participants: { include: { user: { select: { id: true, name: true, role: true, avatar: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: { select: { id: true, name: true } } } },
      },
    });
  }
}
