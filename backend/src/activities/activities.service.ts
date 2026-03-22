import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  // ===================== MENUS =====================
  async getMenus() {
    return this.prisma.menu.findMany({
      orderBy: { startDate: 'desc' },
      include: { author: { select: { id: true, name: true, role: true } } },
    });
  }

  async createMenu(authorId: string, data: any) {
    const { title, content, startDate, endDate } = data;
    if (!title || !content || !startDate || !endDate) {
      throw new BadRequestException('Заполните все поля меню');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const menu = await this.prisma.menu.create({
      data: {
        title,
        content,
        startDate: start,
        endDate: end,
        authorId,
      },
    });

    // Create a FeedItem automatically
    await this.prisma.feedItem.create({
      data: {
        type: 'menu',
        scope: 'school',
        authorId,
        title: `Новое меню: ${title}`,
        text: content,
      },
    });

    return menu;
  }

  async deleteMenu(id: string) {
    return this.prisma.menu.delete({ where: { id } });
  }

  // ===================== EVENTS =====================
  async getEvents() {
    return this.prisma.event.findMany({
      orderBy: { eventDate: 'desc' },
      include: { author: { select: { id: true, name: true, role: true } } },
    });
  }

  async createEvent(authorId: string, data: any) {
    const { title, description, eventDate } = data;
    if (!title || !eventDate) {
      throw new BadRequestException('Укажите название и дату события');
    }

    const edate = new Date(eventDate);

    const event = await this.prisma.event.create({
      data: {
        title,
        description,
        eventDate: edate,
        authorId,
      },
    });

    // Create a FeedItem automatically
    await this.prisma.feedItem.create({
      data: {
        type: 'event',
        scope: 'school',
        authorId,
        title: `Событие: ${title}`,
        text: description ? `Дата: ${edate.toLocaleDateString('ru')}\n\n${description}` : `Дата: ${edate.toLocaleDateString('ru')}`,
      },
    });

    return event;
  }

  async deleteEvent(id: string) {
    return this.prisma.event.delete({ where: { id } });
  }

  // ===================== BROADCASTS =====================
  async getBroadcasts() {
    return this.prisma.broadcast.findMany({
      orderBy: { sentAt: 'desc' },
      include: { author: { select: { id: true, name: true, role: true } } },
    });
  }

  async createBroadcast(authorId: string, data: any) {
    const { title, message, targetGroups } = data;
    if (!title || !message) {
      throw new BadRequestException('Укажите заголовок и текст рассылки');
    }

    let groupsArray: string[] = [];
    if (Array.isArray(targetGroups)) {
      groupsArray = targetGroups;
    } else if (targetGroups === 'all' || !targetGroups) {
      groupsArray = ['all'];
    }

    // 1. Save broadcast record
    const broadcast = await this.prisma.broadcast.create({
      data: {
        title,
        message,
        authorId,
        targetGroups: groupsArray,
      },
    });

    // 2. Find parent targets
    let parentIds = new Set<string>();

    if (groupsArray.includes('all')) {
      // get all parents
      const allParents = await this.prisma.user.findMany({
        where: { role: 'parent' },
        select: { id: true }
      });
      allParents.forEach(p => parentIds.add(p.id));
    } else {
      // find children in specific groups, then their parents
      const children = await this.prisma.child.findMany({
        where: { groupId: { in: groupsArray } },
        include: { parents: { include: { parent: true } } }
      });
      children.forEach(child => {
        child.parents.forEach(cp => {
          parentIds.add(cp.parentId);
        });
      });
    }

    // 3. Create Notifications for those parents
    if (parentIds.size > 0) {
      const parentArray = Array.from(parentIds);
      const notifications = parentArray.map(pid => ({
        userId: pid,
        type: 'broadcast',
        title: `Рассылка: ${title}`,
        body: message,
      }));

      await this.prisma.notification.createMany({
        data: notifications,
      });
    }

    return {
      message: 'Рассылка успешно отправлена',
      broadcast,
      recipientsCount: parentIds.size,
    };
  }
}
