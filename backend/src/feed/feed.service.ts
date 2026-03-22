import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';
import * as archiver from 'archiver';

@Injectable()
export class FeedService {
  constructor(private prisma: PrismaService) {}

  async getFeedForUser(user: any, childId?: string) {
    const where: any = {};

    if (childId) {
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
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createFeedItem(dto: any, user: any) {
    if (user.role === 'parent') throw new ForbiddenException();
    if (user.role === 'teacher' && dto.scope === 'school') {
      throw new ForbiddenException('Только администратор может публиковать новости сада');
    }
    return this.prisma.feedItem.create({
      data: { ...dto, authorId: user.id },
      include: {
        author: { select: { id: true, name: true } },
        child: { select: { id: true, name: true } },
      },
    });
  }

  async downloadChildPhotos(childId: string, res: Response) {
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

  async deleteFeedItem(id: string, user: any) {
    const item = await this.prisma.feedItem.findUnique({ where: { id } });
    if (!item) return { ok: true };
    if (user.role !== 'admin' && item.authorId !== user.id) throw new ForbiddenException();
    return this.prisma.feedItem.delete({ where: { id } });
  }
}
