import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import * as archiver from 'archiver';
import type { Response } from 'express';

/**
 * Personal-data export — produces a ZIP archive with all data the system holds
 * about the user (and, for parents, about their children).
 *
 * Required by 152-ФЗ: every subject of personal data may demand a copy.
 * Streamed live to avoid holding the whole archive in memory.
 */
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
  ) {}

  async streamExport(userId: string, res: Response): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, role: true,
        phone: true, avatar: true, consentGivenAt: true, createdAt: true,
      },
    });
    if (!user) return;

    const filename = `globoatlas-export-${user.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const archive = (archiver as any)('zip', { zlib: { level: 6 } });
    archive.on('warning', (err: Error) => this.logger.warn(`archive warning: ${err.message}`));
    archive.on('error', (err: Error) => {
      this.logger.error(`archive error: ${err.message}`);
      try { res.end(); } catch { /* */ }
    });
    archive.pipe(res);

    // README
    archive.append(this.makeReadme(user), { name: 'README.txt' });

    // User profile
    archive.append(JSON.stringify(user, null, 2), { name: 'profile.json' });

    if (user.role === 'parent') {
      await this.exportParent(user.id, archive);
    } else {
      await this.exportStaff(user.id, archive);
    }

    await archive.finalize();
  }

  private makeReadme(user: { name: string; email: string; role: string }): string {
    return `Экспорт персональных данных — ГлобоАтлас
=================================================

Пользователь: ${user.name}
Email: ${user.email}
Роль: ${user.role}
Дата экспорта: ${new Date().toISOString()}

Это полный архив данных, которые хранит о вас система ГлобоАтлас
в соответствии с правом субъекта персональных данных получить копию
обрабатываемых данных (152-ФЗ, ст. 14).

Содержимое архива:
  /README.txt                    — этот файл
  /profile.json                  — ваши контактные данные
  /children/<имя ребёнка>/       — данные ребёнка (только для родителей)
    profile.json                 — карточка ребёнка
    progress.json                — освоенные навыки
    observations.json            — записи педагога
    portfolio.json               — портфолио работ
    attendance.json              — посещаемость
    notes.json                   — записи специалистов (только видимые вам)
    home-tasks.json              — рекомендации
    photos/                      — все фото из ленты, помеченные вашим ребёнком

Если у вас есть вопросы — обратитесь к администрации сада.
`;
  }

  private async exportParent(userId: string, archive: any) {
    const links = await this.prisma.childParent.findMany({
      where: { parentId: userId },
      include: {
        child: {
          include: {
            group: { select: { id: true, name: true } },
          },
        },
      },
    });

    for (const { child } of links) {
      const safeName = (child.name || child.id).replace(/[\/\\:*?"<>|]/g, '_');
      const dir = `children/${safeName}`;

      archive.append(JSON.stringify(child, null, 2), { name: `${dir}/profile.json` });

      const [progress, observations, portfolio, attendance, notes, homeTasks, feedItems] = await Promise.all([
        this.prisma.progress.findMany({
          where: { childId: child.id },
          include: { skill: { select: { id: true, title: true } }, history: true },
        }),
        this.prisma.observation.findMany({
          where: { childId: child.id },
          include: { author: { select: { name: true, role: true } } },
        }),
        this.prisma.portfolioItem.findMany({ where: { childId: child.id } }),
        this.prisma.attendance.findMany({ where: { childId: child.id } }),
        this.prisma.specialistNote.findMany({
          where: {
            childId: child.id,
            visibility: { in: ['with_parent'] },
          },
          include: { specialist: { select: { name: true, role: true } } },
        }),
        this.prisma.homeTask.findMany({ where: { childId: child.id } }),
        this.prisma.feedItem.findMany({
          where: { childId: child.id },
          select: { id: true, type: true, title: true, text: true, mediaUrls: true, createdAt: true },
        }),
      ]);

      archive.append(JSON.stringify(progress, null, 2),     { name: `${dir}/progress.json` });
      archive.append(JSON.stringify(observations, null, 2), { name: `${dir}/observations.json` });
      archive.append(JSON.stringify(portfolio, null, 2),    { name: `${dir}/portfolio.json` });
      archive.append(JSON.stringify(attendance, null, 2),   { name: `${dir}/attendance.json` });
      archive.append(JSON.stringify(notes, null, 2),        { name: `${dir}/notes.json` });
      archive.append(JSON.stringify(homeTasks, null, 2),    { name: `${dir}/home-tasks.json` });
      archive.append(JSON.stringify(feedItems, null, 2),    { name: `${dir}/feed.json` });

      // Photos
      const photoUrls = feedItems.flatMap(i => i.mediaUrls)
        .concat(portfolio.map(p => p.fileUrl).filter((u): u is string => Boolean(u)));
      let photoIdx = 0;
      for (const url of photoUrls) {
        const filename = url.split('/').pop();
        if (!filename) continue;
        try {
          const stream = await this.files.getFileStream(filename);
          photoIdx++;
          archive.append(stream, { name: `${dir}/photos/${filename}` });
        } catch (e) {
          this.logger.warn(`photo skipped: ${filename} — ${(e as Error).message}`);
        }
      }
      this.logger.log(`exported child ${child.name}: ${photoIdx} photos`);
    }
  }

  private async exportStaff(userId: string, archive: any) {
    // Staff get their own authored content + system-level info.
    const [authoredObservations, authoredNotes, authoredFeed, authoredHomeTasks] = await Promise.all([
      this.prisma.observation.findMany({ where: { userId } }),
      this.prisma.specialistNote.findMany({ where: { specialistId: userId } }),
      this.prisma.feedItem.findMany({ where: { authorId: userId } }),
      this.prisma.homeTask.findMany({ where: { authorId: userId } }),
    ]);
    archive.append(JSON.stringify(authoredObservations, null, 2), { name: 'authored/observations.json' });
    archive.append(JSON.stringify(authoredNotes, null, 2),        { name: 'authored/notes.json' });
    archive.append(JSON.stringify(authoredFeed, null, 2),         { name: 'authored/feed.json' });
    archive.append(JSON.stringify(authoredHomeTasks, null, 2),    { name: 'authored/home-tasks.json' });
  }
}
