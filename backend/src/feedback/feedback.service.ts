import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, message: string, isAnonymous: boolean) {
    const text = (message || '').trim();
    if (text.length < 3) throw new BadRequestException('Сообщение слишком короткое');
    if (text.length > 4000) throw new BadRequestException('Сообщение слишком длинное');
    return this.prisma.feedback.create({
      data: {
        message: text,
        isAnonymous,
        authorId: isAnonymous ? null : userId,
      },
      select: { id: true, createdAt: true },
    });
  }

  async list(filter: 'all' | 'unread') {
    return this.prisma.feedback.findMany({
      where: filter === 'unread' ? { read: false } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  async unreadCount() {
    const count = await this.prisma.feedback.count({ where: { read: false } });
    return { count };
  }

  async markRead(id: string) {
    const existing = await this.prisma.feedback.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Обратная связь не найдена');
    return this.prisma.feedback.update({
      where: { id },
      data: { read: true, readAt: new Date() },
      select: { id: true, read: true, readAt: true },
    });
  }
}
