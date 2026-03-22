import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  getNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  readAll(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async send(userId: string, type: string, title: string, body: string, data?: any) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, title, body, data },
    });
    // Phase 1: заглушка — реальный push (FCM/APNs) подключим в Phase 2
    console.log(`[PUSH] → ${userId}: ${title} — ${body}`);
    return notification;
  }

  async sendToMany(userIds: string[], type: string, title: string, body: string, data?: any) {
    await Promise.all(userIds.map((uid) => this.send(uid, type, title, body, data)));
  }
}
