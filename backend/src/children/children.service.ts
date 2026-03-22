import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChildrenService {
  constructor(private prisma: PrismaService) {}

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

  async getChildProfile(childId: string, user: any) {
    await this.checkChildAccess(childId, user);
    return this.prisma.child.findUnique({
      where: { id: childId },
      include: {
        group: { include: { teacher: { select: { id: true, name: true } } } },
        parents: { include: { parent: { select: { id: true, name: true, email: true } } } },
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
      const child = await this.prisma.child.findUnique({ where: { id: childId } });
      await this.prisma.feedItem.create({
        data: {
          type: 'child_achievement',
          scope: 'child',
          authorId: user.id,
          childId,
          groupId: child?.groupId,
          title: `Освоен навык: ${skill?.title}`,
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
    return this.prisma.observation.create({ data: { ...dto, childId, userId: user.id } });
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

  getHomeTasks(childId: string) {
    return this.prisma.homeTask.findMany({
      where: { childId },
      include: { skill: { select: { id: true, title: true } } },
      orderBy: { id: 'desc' },
    });
  }

  updateHomeTask(taskId: string, dto: any) {
    return this.prisma.homeTask.update({
      where: { id: taskId },
      data: { status: dto.completed ? 'done' : 'pending' },
    });
  }

  createHomeTask(childId: string, dto: any) {
    return this.prisma.homeTask.create({
      data: {
        childId,
        skillId: dto.skillId,
        title: dto.title,
        description: dto.description,
      },
      include: { skill: { select: { id: true, title: true } } },
    });
  }

  deleteHomeTask(taskId: string) {
    return this.prisma.homeTask.delete({
      where: { id: taskId },
    });
  }

  private async checkChildAccess(childId: string, user: any) {
    if (user.role === 'admin') return;
    if (user.role === 'teacher') {
      const group = await this.prisma.group.findFirst({ where: { teacherId: user.id } });
      if (!group) throw new ForbiddenException();
      const child = await this.prisma.child.findFirst({ where: { id: childId, groupId: group.id } });
      if (!child) throw new ForbiddenException();
      return;
    }
    if (user.role === 'parent') {
      const rel = await this.prisma.childParent.findFirst({ where: { childId, parentId: user.id } });
      if (!rel) throw new ForbiddenException();
      return;
    }
    if (user.role === 'psychologist' || user.role === 'pediatrician') {
      const rel = await this.prisma.childSpecialist.findFirst({ where: { childId, specialistId: user.id } });
      if (!rel) throw new ForbiddenException();
      return;
    }
    throw new ForbiddenException();
  }
}
