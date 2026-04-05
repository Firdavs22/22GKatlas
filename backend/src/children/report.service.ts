import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  async generateChildReport(childId: string): Promise<Buffer> {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      include: {
        group: { include: { teacher: { select: { name: true } } } },
        parents: { include: { parent: { select: { name: true } } } },
      },
    });

    if (!child) throw new Error('Child not found');

    const progress = await this.prisma.progress.findMany({
      where: { childId },
      include: { skill: { include: { group: { include: { area: true } } } } },
      orderBy: { updatedAt: 'desc' },
    });

    const observations = await this.prisma.observation.findMany({
      where: { childId, visible: true },
      include: { author: { select: { name: true } } },
      orderBy: { date: 'desc' },
      take: 5,
    });

    const attendance = await this.prisma.attendance.findMany({
      where: { childId },
      orderBy: { date: 'desc' },
      take: 30,
    });

    const presentDays = attendance.filter(a => a.status === 'present').length;
    const masteredSkills = progress.filter(p => p.stage === 'mastered');
    const practicingSkills = progress.filter(p => p.stage === 'practicing');

    // Group mastered skills by area
    const byArea: Record<string, typeof masteredSkills> = {};
    for (const p of masteredSkills) {
      const areaTitle = p.skill.group.area.title;
      if (!byArea[areaTitle]) byArea[areaTitle] = [];
      byArea[areaTitle].push(p);
    }

    const age = Math.floor(
      (Date.now() - new Date(child.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );

    // Use pdfmake
    const PdfPrinter = require('pdfmake');
    const fonts = {
      Roboto: {
        normal: path.join(__dirname, '..', '..', 'node_modules', 'pdfmake', 'build', 'vfs_fonts.js'),
        bold: path.join(__dirname, '..', '..', 'node_modules', 'pdfmake', 'build', 'vfs_fonts.js'),
      },
    };

    // Try inline fonts approach
    let printer: any;
    try {
      printer = new PdfPrinter(fonts);
    } catch {
      // Fallback: use default fonts path
      const fallbackFonts = {
        Helvetica: {
          normal: 'Helvetica',
          bold: 'Helvetica-Bold',
        },
      };
      printer = new PdfPrinter(fallbackFonts);
    }

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40],
      defaultStyle: { font: Object.keys(fonts)[0] || 'Helvetica', fontSize: 11, lineHeight: 1.4 },
      content: [
        { text: 'ГлобоАтлас — Отчёт о развитии ребёнка', style: 'header' },
        {
          canvas: [
            { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#E2E8F0' },
          ],
        },
        { text: '\n' },

        // Header info
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: child.name, fontSize: 18, bold: true, color: '#1E293B' },
                {
                  text: `${age} лет  ·  Группа: ${child.group?.name || '—'}`,
                  fontSize: 11,
                  color: '#64748B',
                },
                {
                  text: `Педагог: ${child.group?.teacher?.name || '—'}`,
                  fontSize: 11,
                  color: '#64748B',
                },
              ],
            },
            {
              width: 'auto',
              stack: [
                {
                  text: `Дата отчёта: ${new Date().toLocaleDateString('ru-RU')}`,
                  fontSize: 10,
                  color: '#94A3B8',
                  alignment: 'right',
                },
                {
                  text: `Посещаемость: ${presentDays} / ${attendance.length} дней`,
                  fontSize: 10,
                  color: '#94A3B8',
                  alignment: 'right',
                },
              ],
            },
          ],
        },
        { text: '\n' },

        // Mastered skills by area
        { text: 'Освоенные навыки по зонам', style: 'sectionHeader' },
        ...Object.entries(byArea)
          .map(([areaTitle, skills]) => [
            {
              text: areaTitle,
              fontSize: 11,
              bold: true,
              color: '#1D4ED8',
              margin: [0, 8, 0, 4] as [number, number, number, number],
            },
            {
              ul: skills.map(p => ({
                text: p.skill.title,
                fontSize: 10,
                color: '#374151',
              })),
              margin: [8, 0, 0, 0] as [number, number, number, number],
            },
          ])
          .flat(),

        { text: '\n' },

        // Practicing skills
        ...(practicingSkills.length > 0
          ? [
              { text: 'В процессе освоения', style: 'sectionHeader' },
              {
                ul: practicingSkills.slice(0, 10).map(p => ({
                  text: `${p.skill.title} (${p.skill.group.area.title})`,
                  fontSize: 10,
                  color: '#374151',
                })),
                margin: [8, 4, 0, 0] as [number, number, number, number],
              },
            ]
          : []),

        { text: '\n' },

        // Observations
        ...(observations.length > 0
          ? [
              { text: 'Последние наблюдения педагога', style: 'sectionHeader' },
              ...observations.map(o => ({
                stack: [
                  {
                    text: new Date(o.date).toLocaleDateString('ru-RU'),
                    fontSize: 9,
                    color: '#94A3B8',
                  },
                  {
                    text: o.text,
                    fontSize: 10,
                    color: '#374151',
                    margin: [0, 2, 0, 8] as [number, number, number, number],
                  },
                ],
              })),
            ]
          : []),

        // Summary
        {
          canvas: [
            { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#E2E8F0' },
          ],
        },
        {
          text: `Всего навыков в работе: ${progress.length}  ·  Освоено: ${masteredSkills.length}  ·  В процессе: ${practicingSkills.length}`,
          fontSize: 10,
          color: '#64748B',
          margin: [0, 8, 0, 0] as [number, number, number, number],
        },
      ],
      styles: {
        header: {
          fontSize: 14,
          bold: true,
          color: '#1E40AF',
          margin: [0, 0, 0, 8] as [number, number, number, number],
        },
        sectionHeader: {
          fontSize: 12,
          bold: true,
          color: '#1E293B',
          margin: [0, 4, 0, 6] as [number, number, number, number],
        },
      },
    };

    return new Promise((resolve, reject) => {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', (err: Error) => reject(err));
      pdfDoc.end();
    });
  }
}
