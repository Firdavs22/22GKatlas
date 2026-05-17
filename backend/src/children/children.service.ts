import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../common/access-control.service';

@Injectable()
export class ChildrenService {
  constructor(
    private prisma: PrismaService,
    private accessControl: AccessControlService,
  ) {}

  async getChildrenForUser(user: any) {
    switch (user.role) {
      case 'admin':
        return this.prisma.child.findMany({ include: { group: true }, orderBy: { name: 'asc' } });
      case 'teacher': {
        const group = await this.prisma.group.findFirst({ where: { teacherId: user.id } });
        if (!group) return [];
        return this.prisma.child.findMany({ where: { groupId: group.id }, include: { group: true }, orderBy: { name: 'asc' } });
      }
      case 'parent':
        return this.prisma.child.findMany({
          where: { parents: { some: { parentId: user.id } } },
          include: { group: true }, orderBy: { name: 'asc' },
        });
      case 'psychologist':
      case 'pediatrician':
        return this.prisma.child.findMany({
          where: { specialists: { some: { specialistId: user.id } } },
          include: { group: true }, orderBy: { name: 'asc' },
        });
      default:
        return [];
    }
  }

  async getGroupProgress(user: any) {
    const group = await this.prisma.group.findFirst({
      where: { teacherId: user.id },
      include: {
        children: { orderBy: { name: 'asc' } },
      },
    });
    if (!group) return { children: [], areas: [], progress: {} };

    const areas = await this.prisma.area.findMany({
      include: {
        groups: {
          include: { skills: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const allProgress = await this.prisma.progress.findMany({
      where: { childId: { in: group.children.map(c => c.id) } },
    });

    const progressMap: Record<string, Record<string, string>> = {};
    for (const p of allProgress) {
      if (!progressMap[p.childId]) progressMap[p.childId] = {};
      progressMap[p.childId][p.skillId] = p.stage;
    }

    return { children: group.children, areas, progress: progressMap };
  }

  async getGroupHeatmap(user: any) {
    const group = await this.prisma.group.findFirst({
      where: { teacherId: user.id },
      include: { children: true },
    });
    if (!group || !group.children.length) return [];

    const childIds = group.children.map(c => c.id);
    const total = childIds.length;

    const progress = await this.prisma.progress.findMany({
      where: { childId: { in: childIds } },
      include: { skill: { include: { group: { include: { area: true } } } } },
    });

    const skillStats: Record<string, { title: string; area: string; color: string; mastered: number; practicing: number; total: number }> = {};

    for (const p of progress) {
      const sid = p.skillId;
      if (!skillStats[sid]) {
        skillStats[sid] = {
          title: p.skill.title,
          area: p.skill.group.area.title,
          color: p.skill.group.area.color,
          mastered: 0,
          practicing: 0,
          total,
        };
      }
      if (p.stage === 'mastered') skillStats[sid].mastered++;
      if (p.stage === 'practicing') skillStats[sid].practicing++;
    }

    return Object.values(skillStats)
      .map(s => ({ ...s, pct: Math.round(((s.mastered + s.practicing * 0.5) / s.total) * 100) }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 30);
  }

  async getChildProfile(childId: string, user: any) {
    await this.checkChildAccess(childId, user);
    return this.prisma.child.findUnique({
      where: { id: childId },
      include: {
        group: { include: { teacher: { select: { id: true, name: true } } } },
        parents: { include: { parent: { select: { id: true, name: true, email: true, phone: true } } } },
        specialists: { include: { specialist: { select: { id: true, name: true, role: true } } } },
      },
    });
  }

  getProgress(childId: string) {
    return this.prisma.progress.findMany({
      where: { childId },
      include: { skill: { include: { group: { include: { area: true } } } } },
    });
  }

  getProgressHistory(childId: string) {
    return this.prisma.progressHistory.findMany({
      where: { progress: { childId } },
      include: { progress: { include: { skill: { include: { group: true } } } } },
      orderBy: { changedAt: 'asc' },
    });
  }

  async updateProgress(childId: string, dto: { skillId: string; stage: any; note?: string }, user: any) {
    const existing = await this.prisma.progress.findUnique({
      where: { childId_skillId: { childId, skillId: dto.skillId } },
    });

    const progress = await this.prisma.progress.upsert({
      where: { childId_skillId: { childId, skillId: dto.skillId } },
      update: { stage: dto.stage, updatedById: user.id },
      create: { childId, skillId: dto.skillId, stage: dto.stage, updatedById: user.id },
    });

    if (existing) {
      await this.prisma.progressHistory.create({
        data: {
          progressId: progress.id,
          oldStage: existing.stage,
          newStage: dto.stage,
          note: dto.note,
          changedBy: user.id,
        },
      });
    }

    if (dto.stage === 'mastered') {
      const skill = await this.prisma.skill.findUnique({ where: { id: dto.skillId } });
      if (!skill) throw new NotFoundException('Skill not found');
      const child = await this.prisma.child.findUnique({ where: { id: childId } });
      if (!child) throw new NotFoundException('Child not found');
      await this.prisma.feedItem.create({
        data: {
          type: 'child_achievement',
          scope: 'child',
          authorId: user.id,
          childId,
          groupId: child.groupId,
          title: `Освоен навык: ${skill.title}`,
          text: 'Поздравляем! Освоен новый навык.',
        },
      });
    }

    return progress;
  }

  async getObservations(childId: string, user: any) {
    const where: any = { childId };
    if (user.role === 'parent') where.visible = true;
    return this.prisma.observation.findMany({
      where,
      include: { author: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });
  }

  createObservation(childId: string, dto: any, user: any) {
    const title = typeof dto?.title === 'string' ? dto.title.trim() : '';
    const rawText = typeof dto?.text === 'string' ? dto.text.trim() : '';
    const text = rawText || title || 'Наблюдение';
    const photos = Array.isArray(dto?.photos)
      ? dto.photos.filter((p: unknown): p is string => typeof p === 'string')
      : [];
    const tags = Array.isArray(dto?.tags)
      ? dto.tags.filter((t: unknown): t is string => typeof t === 'string')
      : [];
    return this.prisma.observation.create({
      data: {
        childId,
        userId: user.id,
        title: title || null,
        text,
        areaId: typeof dto?.areaId === 'string' && dto.areaId ? dto.areaId : null,
        tags,
        photos,
        visible: dto?.visible === false ? false : true,
      },
    });
  }

  getPortfolio(childId: string) {
    return this.prisma.portfolioItem.findMany({
      where: { childId },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });
  }

  createPortfolioItem(childId: string, dto: any, user: any) {
    return this.prisma.portfolioItem.create({
      data: {
        ...dto,
        childId,
        authorId: user.id,
      },
    });
  }

  getAttendance(childId: string) {
    return this.prisma.attendance.findMany({ where: { childId }, orderBy: { date: 'desc' } });
  }

  getPayments(childId: string) {
    return this.prisma.payment.findMany({ where: { childId }, orderBy: { month: 'desc' } });
  }

  async getNotes(childId: string, user: any) {
    const where: any = { childId };
    if (user.role === 'psychologist' || user.role === 'pediatrician') {
      where.specialistId = user.id;
    } else if (user.role === 'teacher') {
      where.visibility = { in: ['with_teacher', 'with_parent'] };
    } else if (user.role === 'parent') {
      where.visibility = 'with_parent';
    }
    return this.prisma.specialistNote.findMany({
      where,
      include: { specialist: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  createNote(childId: string, dto: any, user: any) {
    return this.prisma.specialistNote.create({ data: { ...dto, childId, specialistId: user.id } });
  }

  getChildFeed(childId: string) {
    return this.prisma.feedItem.findMany({
      where: { childId },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getHomeTasks(childId: string) {
    const tasks = await this.prisma.homeTask.findMany({
      where: { childId },
      include: { skill: { select: { id: true, title: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    const authorIds = Array.from(
      new Set(tasks.map(t => t.authorId).filter((id): id is string => !!id)),
    );
    const authors = authorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: authorIds } },
          select: { id: true, name: true, role: true },
        })
      : [];
    const authorById = new Map(authors.map(a => [a.id, a]));
    return tasks.map(t => ({
      ...t,
      author: t.authorId ? authorById.get(t.authorId) || null : null,
    }));
  }

  updateHomeTask(childId: string, taskId: string, dto: any) {
    return this.prisma.homeTask.update({
      where: { id: taskId, childId },
      data: { status: dto.completed ? 'done' : 'pending' },
    });
  }

  async createHomeTask(childId: string, dto: any, user?: { id: string; role: string }) {
    const tags: string[] = Array.isArray(dto?.tags)
      ? dto.tags.filter((t: unknown): t is string => typeof t === 'string')
      : [];
    const task = await this.prisma.homeTask.create({
      data: {
        childId,
        skillId: typeof dto?.skillId === 'string' && dto.skillId ? dto.skillId : null,
        authorId: user?.id || null,
        authorRole: user?.role || null,
        title: dto.title,
        description: dto.description ?? null,
        tags,
      },
      include: { skill: { select: { id: true, title: true } } },
    });

    // Notify parents
    try {
      const parents = await this.prisma.childParent.findMany({
        where: { childId },
        select: { parentId: true },
      });
      if (parents.length > 0) {
        const child = await this.prisma.child.findUnique({
          where: { id: childId },
          select: { name: true },
        });
        const roleLabel = user?.role === 'pediatrician'
          ? 'Педиатр'
          : user?.role === 'psychologist'
            ? 'Психолог'
            : user?.role === 'teacher'
              ? 'Педагог'
              : 'Сотрудник';
        const important = tags.some(t => /важно|важн/i.test(t));
        await this.prisma.notification.createMany({
          data: parents.map(p => ({
            userId: p.parentId,
            type: 'recommendation',
            title: `${roleLabel}: ${task.title}`,
            body: `${child?.name ? `Для ${child.name}` : ''}${
              tags.length ? ` · ${tags.join(', ')}` : ''
            }`,
            data: { taskId: task.id, important, tags },
            read: false,
          })),
        });
      }
    } catch {
      /* Notification creation is best-effort. */
    }

    return task;
  }

  deleteHomeTask(childId: string, taskId: string) {
    return this.prisma.homeTask.delete({
      where: { id: taskId, childId },
    });
  }

  private checkChildAccess(childId: string, user: any) {
    return this.accessControl.checkChildAccess(childId, user);
  }
}
