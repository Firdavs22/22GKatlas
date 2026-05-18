import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../common/access-control.service';
import { Response } from 'express';
import * as archiver from 'archiver';

@Injectable()
export class FeedService {
  constructor(
    private prisma: PrismaService,
    private accessControl: AccessControlService,
  ) {}

  async getFeedForUser(user: any, childId?: string) {
    const userId = user.id;
    const where: any = {};

    if (childId) {
      await this.checkChildAccess(childId, user);
      where.childId = childId;
    } else if (user.role === 'parent') {
      const children = await this.prisma.childParent.findMany({ where: { parentId: user.id } });
      const childIds = children.map((c) => c.childId);
      where.OR = [
        { scope: 'school' },
        { scope: 'child', childId: { in: childIds } },
        { scope: 'group', group: { children: { some: { id: { in: childIds } } } } },
      ];
    } else if (user.role === 'teacher') {
      const group = await this.prisma.group.findFirst({ where: { teacherId: user.id } });
      where.OR = [
        { scope: 'school' },
        { scope: 'group', groupId: group?.id },
        { scope: 'child', child: { groupId: group?.id } },
      ];
    }
    // admin sees all (no filter)

    return this.prisma.feedItem.findMany({
      where,
      include: {
        author: { select: { id: true, name: true } },
        child: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
        _count: { select: { likes: true } },
        likes: { where: { userId }, select: { userId: true } },
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createFeedItem(dto: any, user: any) {
    if (user.role === 'parent') throw new ForbiddenException();
    if (user.role === 'teacher' && dto.scope === 'school') {
      throw new ForbiddenException('Только администратор может публиковать новости сада');
    }

    // Resolve groupId from teacher's own group when needed, so the post is
    // visible in everyone's feed query.
    let groupId: string | null = dto.groupId ?? null;
    let childId: string | null = dto.childId ?? null;

    if (dto.scope === 'group' || (dto.scope === 'child' && childId)) {
      if (!groupId && user.role === 'teacher') {
        const g = await this.prisma.group.findFirst({ where: { teacherId: user.id }, select: { id: true } });
        groupId = g?.id ?? null;
      }
      if (!groupId && childId) {
        const c = await this.prisma.child.findUnique({ where: { id: childId }, select: { groupId: true } });
        groupId = c?.groupId ?? null;
      }
    }

    return this.prisma.feedItem.create({
      data: {
        type: dto.type,
        scope: dto.scope,
        title: dto.title || null,
        text: dto.text || null,
        mediaUrls: dto.mediaUrls || [],
        authorId: user.id,
        ...(childId ? { childId } : {}),
        ...(groupId ? { groupId } : {}),
      },
      include: {
        author: { select: { id: true, name: true } },
        child: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
        _count: { select: { likes: true } },
      },
    });
  }

  async downloadChildPhotos(childId: string, user: any, res: Response) {
    await this.checkChildAccess(childId, user);

    const feedItems = await this.prisma.feedItem.findMany({
      where: { childId, type: 'child_photo' },
    });
    const urls = feedItems.flatMap((item) => item.mediaUrls);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="child-photos-${childId}.zip"`);

    const archive = (archiver as any)('zip');
    archive.pipe(res);
    archive.append(JSON.stringify({ childId, photoCount: urls.length, urls }, null, 2), { name: 'index.json' });
    await archive.finalize();
  }

  private checkChildAccess(childId: string, user: any) {
    return this.accessControl.checkChildAccess(childId, user);
  }

  async deleteFeedItem(id: string, user: any) {
    const item = await this.prisma.feedItem.findUnique({ where: { id } });
    if (!item) return { ok: true };
    if (user.role !== 'admin' && item.authorId !== user.id) throw new ForbiddenException();
    return this.prisma.feedItem.delete({ where: { id } });
  }

  async toggleLike(feedItemId: string, userId: string) {
    const existing = await this.prisma.feedLike.findUnique({
      where: { feedItemId_userId: { feedItemId, userId } },
    });
    if (existing) {
      await this.prisma.feedLike.delete({
        where: { feedItemId_userId: { feedItemId, userId } },
      });
      return { liked: false };
    }
    await this.prisma.feedLike.create({ data: { feedItemId, userId } });
    return { liked: true };
  }
}
