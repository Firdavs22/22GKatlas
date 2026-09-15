import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventQuery, TeamEventDto, TimeEntryDto } from './team.dto';
import { enabledFeatures } from '../features/features.module';
import * as XLSX from 'xlsx';

export type Actor = { id: string; role: string };
export const isManager = (user: Actor) =>
  ['admin', 'superadmin'].includes(user.role);
const activeStaff = {
  role: { not: 'parent' as const },
  blockedAt: null,
  deletedAt: null,
};
export function plannedMinutes(
  start?: string | null,
  end?: string | null,
  rest = 0,
) {
  if (!start && !end) {
    if (rest) throw new BadRequestException('Укажите смену для перерыва');
    return 0;
  }
  if (!start || !end)
    throw new BadRequestException('Укажите начало и конец смены');
  const minutes = (time: string) =>
    Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const difference = (minutes(end) - minutes(start) + 1440) % 1440;
  if (!difference || rest >= difference)
    throw new BadRequestException('Проверьте длительность смены и перерыва');
  return difference - rest;
}
@Injectable()
export class TeamService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  constructor(private prisma: PrismaService) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      void this.remind().catch(() => {});
    }, 30000);
    this.timer.unref?.();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  directory() {
    return this.prisma.user.findMany({
      where: activeStaff,
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });
  }
  private async staff(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, ...activeStaff },
      select: { id: true, name: true },
    });
    if (!user) throw new NotFoundException('Сотрудник недоступен');
    return user;
  }
  private permit(userId: string, actor: Actor) {
    if (!isManager(actor) && actor.id !== userId)
      throw new ForbiddenException();
  }
  async sheet(userId: string, month: string, actor: Actor) {
    this.permit(userId, actor);
    const user = await this.staff(userId);
    const sheet = await this.prisma.staffTimesheet.findUnique({
      where: { userId_month: { userId, month } },
      include: { entries: { orderBy: { date: 'asc' } } },
    });
    return {
      user,
      month,
      approvedAt: sheet?.approvedAt || null,
      entries: sheet?.entries || [],
    };
  }
  private async lock(tx: any, userId: string, month: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'timesheet:' + userId + ':' + month}))`;
  }
  async saveTime(userId: string, dto: TimeEntryDto, actor: Actor) {
    this.permit(userId, actor);
    await this.staff(userId);
    const parsed = new Date(dto.date + 'T00:00:00Z');
    if (
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== dto.date
    )
      throw new BadRequestException('Неверная дата');
    const month = dto.date.slice(0, 7);
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, userId, month);
      const sheet = await tx.staffTimesheet.upsert({
        where: { userId_month: { userId, month } },
        create: { userId, month },
        update: {},
      });
      if (sheet.approvedAt)
        throw new ConflictException(
          'Табель утверждён. Руководитель должен открыть его для исправления',
        );
      const current = await tx.staffTimeEntry.findUnique({
        where: { sheetId_date: { sheetId: sheet.id, date: dto.date } },
      });
      if ((current?.revision || 0) !== dto.revision)
        throw new ConflictException('Запись уже изменена. Обновите табель');
      if (
        !isManager(actor) &&
        (dto.clearPlan !== undefined ||
          dto.plannedStart !== undefined ||
          dto.plannedEnd !== undefined ||
          dto.breakMinutes !== undefined)
      )
        throw new ForbiddenException('График задаёт руководитель');
      const start = dto.clearPlan
        ? null
        : (dto.plannedStart ?? current?.plannedStart);
      const end = dto.clearPlan
        ? null
        : (dto.plannedEnd ?? current?.plannedEnd);
      const rest = dto.clearPlan
        ? 0
        : (dto.breakMinutes ?? current?.breakMinutes ?? 0);
      if (dto.status !== 'work' && dto.actualMinutes)
        throw new BadRequestException(
          'Для отсутствия фактическое время должно быть нулевым',
        );
      const data = {
        plannedStart: start,
        plannedEnd: end,
        breakMinutes: rest,
        plannedMinutes: plannedMinutes(start, end, rest),
        actualMinutes: dto.status === 'work' ? (dto.actualMinutes ?? null) : 0,
        status: dto.status,
        note: dto.note,
        updatedById: actor.id,
        revision: dto.revision + 1,
      };
      return tx.staffTimeEntry.upsert({
        where: { sheetId_date: { sheetId: sheet.id, date: dto.date } },
        create: { ...data, sheetId: sheet.id, date: dto.date },
        update: data,
      });
    });
  }
  async approve(userId: string, month: string, actor: Actor, reopen = false) {
    if (!isManager(actor)) throw new ForbiddenException();
    await this.staff(userId);
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, userId, month);
      const sheet = await tx.staffTimesheet.findUnique({
        where: { userId_month: { userId, month } },
        include: { entries: true },
      });
      if (!sheet) throw new BadRequestException('Табель пуст');
      if (
        !reopen &&
        (!sheet.entries.length ||
          sheet.entries.some((entry) => entry.actualMinutes === null))
      )
        throw new BadRequestException(
          'Заполните фактические часы всех внесённых дней',
        );
      return tx.staffTimesheet.update({
        where: { id: sheet.id },
        data: {
          approvedAt: reopen ? null : new Date(),
          approvedById: reopen ? null : actor.id,
        },
      });
    });
  }
  async export(userId: string, month: string, actor: Actor) {
    const sheet = await this.sheet(userId, month, actor);
    const labels = {
      work: 'Работа',
      sick: 'Болезнь',
      vacation: 'Отпуск',
      absent: 'Отсутствие',
      day_off: 'Выходной',
    };
    const rows = sheet.entries.map((e) => ({
      Сотрудник: sheet.user.name,
      Дата: e.date,
      Начало: e.plannedStart || '',
      Конец: e.plannedEnd || '',
      'План, ч': e.plannedMinutes / 60,
      'Факт, ч': e.actualMinutes === null ? '' : e.actualMinutes / 60,
      Статус: labels[e.status] || e.status,
      Примечание: e.note,
      Утверждён: sheet.approvedAt ? 'Да' : 'Нет',
    }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.json_to_sheet(rows),
      'Табель',
    );
    return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
  async events(query: EventQuery, actor: Actor) {
    const from = new Date(query.from),
      to = new Date(query.to);
    if (to <= from || to.getTime() - from.getTime() > 370 * 86400000)
      throw new BadRequestException('Выберите период до года');
    return this.prisma.teamEvent.findMany({
      where: {
        startsAt: { lt: to },
        endsAt: { gt: from },
        cancelled: false,
        ...(!isManager(actor)
          ? {
              OR: [
                { visibility: 'staff' },
                { authorId: actor.id },
                { participantIds: { has: actor.id } },
              ],
            }
          : {}),
      },
      orderBy: { startsAt: 'asc' },
    });
  }
  private async validateEvent(dto: TeamEventDto) {
    if (!dto.title.trim()) throw new BadRequestException('Укажите название');
    const startsAt = new Date(dto.startsAt),
      endsAt = new Date(dto.endsAt);
    if (
      endsAt <= startsAt ||
      endsAt.getTime() - startsAt.getTime() > 7 * 86400000
    )
      throw new BadRequestException('Проверьте время события (до 7 дней)');
    const count = await this.prisma.user.count({
      where: { id: { in: dto.participantIds }, ...activeStaff },
    });
    if (count !== dto.participantIds.length)
      throw new BadRequestException('Выберите действующих сотрудников');
    return {
      title: dto.title.trim(),
      description: dto.description,
      kind: dto.kind,
      startsAt,
      endsAt,
      visibility: dto.visibility,
      participantIds: dto.participantIds,
      reminderMinutes: dto.reminderMinutes,
      remindedAt: null,
    };
  }
  async saveEvent(dto: TeamEventDto, actor: Actor, id?: string) {
    const data = await this.validateEvent(dto);
    if (!id)
      return this.prisma.teamEvent.create({
        data: { ...data, authorId: actor.id },
      });
    const current = await this.prisma.teamEvent.findUnique({ where: { id } });
    if (!current) throw new NotFoundException();
    if (!isManager(actor) && current.authorId !== actor.id)
      throw new ForbiddenException();
    const changed = await this.prisma.teamEvent.updateMany({
      where: { id, revision: dto.revision ?? -1, cancelled: false },
      data: { ...data, revision: { increment: 1 } },
    });
    if (!changed.count)
      throw new ConflictException('Событие уже изменено. Обновите календарь');
    return this.prisma.teamEvent.findUnique({ where: { id } });
  }
  async cancel(id: string, revision: number, actor: Actor) {
    const current = await this.prisma.teamEvent.findUnique({ where: { id } });
    if (!current) throw new NotFoundException();
    if (!isManager(actor) && current.authorId !== actor.id)
      throw new ForbiddenException();
    const changed = await this.prisma.teamEvent.updateMany({
      where: { id, revision },
      data: { cancelled: true, revision: { increment: 1 } },
    });
    if (!changed.count) throw new ConflictException('Событие уже изменено');
    return { ok: true };
  }
  async remind() {
    if (!enabledFeatures().team) return;
    const now = new Date();
    const events = await this.prisma.teamEvent.findMany({
      where: {
        cancelled: false,
        remindedAt: null,
        reminderMinutes: { gt: 0 },
        startsAt: { gt: now, lte: new Date(now.getTime() + 86400000) },
      },
      take: 100,
      orderBy: { startsAt: 'asc' },
    });
    for (const event of events) {
      if (
        event.startsAt.getTime() - now.getTime() >
        event.reminderMinutes * 60000
      )
        continue;
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.teamEvent.updateMany({
          where: {
            id: event.id,
            revision: event.revision,
            cancelled: false,
            remindedAt: null,
          },
          data: { remindedAt: now },
        });
        if (!claimed.count) return;
        const users = await tx.user.findMany({
          where: {
            ...activeStaff,
            ...(event.visibility === 'staff'
              ? {}
              : { id: { in: [...event.participantIds, event.authorId] } }),
          },
          select: { id: true },
        });
        await tx.notification.createMany({
          data: users.map((user) => ({
            userId: user.id,
            type: 'team_event',
            title: 'Скоро встреча команды',
            body: 'Откройте календарь команды, чтобы посмотреть доступные вам события.',
            data: { url: '/team/calendar' },
          })),
        });
      });
    }
  }
}
