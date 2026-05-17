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
  async getEvents(user?: { id: string; role: string }) {
    const events = await this.prisma.event.findMany({
      orderBy: { eventDate: 'asc' },
      include: { author: { select: { id: true, name: true, role: true } } },
    });
    if (!user) return events;
    const flags = await Promise.all(events.map(e => this.isEventVisible(e, user)));
    return events.filter((_, i) => flags[i]);
  }

  private async isEventVisible(
    event: { audience: string; groupId: string | null },
    user: { id: string; role: string },
  ): Promise<boolean> {
    if (event.audience === 'all') return true;
    if (event.audience === 'staff') {
      return ['admin', 'teacher', 'psychologist', 'pediatrician'].includes(user.role);
    }
    if (event.audience === 'parents') return user.role === 'parent' || user.role === 'admin';
    if (event.audience === 'group') {
      if (!event.groupId) return user.role === 'admin';
      if (user.role === 'admin') return true;
      if (user.role === 'teacher') {
        const g = await this.prisma.group.findFirst({ where: { teacherId: user.id } });
        return g?.id === event.groupId;
      }
      if (user.role === 'parent') {
        const c = await this.prisma.child.findFirst({
          where: { groupId: event.groupId, parents: { some: { parentId: user.id } } },
        });
        return !!c;
      }
    }
    return false;
  }

  async createEvent(authorId: string, data: any) {
    const { title, description, eventDate, mediaUrls, audience, groupId } = data;
    if (!title || !eventDate) {
      throw new BadRequestException('Укажите название и дату события');
    }

    const edate = new Date(eventDate);
    const eventAudience = ['all', 'parents', 'group', 'staff'].includes(audience)
      ? audience
      : 'all';
    if (eventAudience === 'group' && !groupId) {
      throw new BadRequestException('Для аудитории «группа» укажите группу');
    }

    const event = await this.prisma.event.create({
      data: {
        title,
        description,
        eventDate: edate,
        mediaUrls: mediaUrls || [],
        audience: eventAudience,
        groupId: eventAudience === 'group' ? groupId : null,
        author: { connect: { id: authorId } },
      },
    });

    // Create a FeedItem with matching scope so feed filters mirror audience
    const feedScope =
      eventAudience === 'group' ? 'group' : eventAudience === 'staff' ? 'school' : 'school';
    await this.prisma.feedItem.create({
      data: {
        type: 'event',
        scope: feedScope,
        groupId: eventAudience === 'group' ? groupId : null,
        author: { connect: { id: authorId } },
        title: `Событие: ${title}`,
        text: description
          ? `Дата: ${edate.toLocaleDateString('ru')}\n\n${description}`
          : `Дата: ${edate.toLocaleDateString('ru')}`,
        mediaUrls: mediaUrls || [],
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
