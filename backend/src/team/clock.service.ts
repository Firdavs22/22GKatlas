import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { BlockList, isIP } from 'net';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, isManager } from './team.service';

export function clockEnabled() {
  return process.env.TEAM_CLOCK_ENABLED === 'true';
}
export function workplaceAllows(address: string) {
  const ip = address.replace(/^::ffff:/i, '');
  const family = isIP(ip);
  if (!family) return false;
  const list = new BlockList();
  const ranges = (process.env.TEAM_WORKPLACE_CIDRS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!ranges.length) return false;
  try {
    for (const range of ranges) {
      const [host, bits, extra] = range.split('/');
      const version = isIP(host);
      if (!version || extra !== undefined) return false;
      const type = version === 4 ? 'ipv4' : 'ipv6';
      if (bits === undefined) list.addAddress(host, type);
      else {
        const prefix = Number(bits);
        if (
          !/^\d+$/.test(bits) ||
          prefix < 1 ||
          prefix > (version === 4 ? 32 : 128)
        )
          return false;
        list.addSubnet(host, prefix, type);
      }
    }
    return list.check(ip, family === 4 ? 'ipv4' : 'ipv6');
  } catch {
    return false;
  }
}

@Injectable()
export class ClockService {
  constructor(private prisma: PrismaService) {}
  private date(now: Date) {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: process.env.TEAM_TIMEZONE || 'Europe/Moscow',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now);
    } catch {
      throw new ServiceUnavailableException(
        'Часовой пояс табеля настроен неверно',
      );
    }
  }
  private permit(ip: string) {
    if (!clockEnabled())
      throw new ForbiddenException(
        'Отметки начала и окончания работы отключены',
      );
    if (!workplaceAllows(ip))
      throw new ForbiddenException(
        'Подключитесь к рабочей сети сада. Отметка с этого IP запрещена',
      );
  }
  async status(actor: Actor, ip: string) {
    const active = await this.prisma.staffClockSession.findFirst({
      where: { userId: actor.id, endedAt: null },
    });
    return {
      enabled: clockEnabled(),
      allowed: workplaceAllows(ip),
      timezone: process.env.TEAM_TIMEZONE || 'Europe/Moscow',
      active,
    };
  }
  async start(actor: Actor, ip: string, requestId: string) {
    this.permit(ip);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'clock:' + actor.id}))`;
      const requestKey = actor.id + ':' + requestId;
      const repeated = await tx.staffClockSession.findUnique({
        where: { requestKey },
      });
      if (repeated) return repeated;
      const active = await tx.staffClockSession.findFirst({
        where: { userId: actor.id, endedAt: null },
      });
      if (active) return active;
      const now = new Date(),
        date = this.date(now),
        month = date.slice(0, 7);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'timesheet:' + actor.id + ':' + month}))`;
      const sheet = await tx.staffTimesheet.upsert({
        where: { userId_month: { userId: actor.id, month } },
        create: { userId: actor.id, month },
        update: {},
      });
      if (sheet.approvedAt) throw new ConflictException('Табель уже утвержден');
      const entry = await tx.staffTimeEntry.findUnique({
        where: { sheetId_date: { sheetId: sheet.id, date } },
      });
      if (entry && entry.status !== 'work')
        throw new ConflictException(
          'В табеле отмечено отсутствие. Обратитесь к руководителю',
        );
      const previous = await tx.staffClockSession.findMany({
        where: { userId: actor.id, date, endedAt: { not: null } },
      });
      const clockMinutes = Math.max(
        0,
        Math.floor(
          previous.reduce(
            (sum, s) => sum + s.endedAt!.getTime() - s.startedAt.getTime(),
            0,
          ) / 60000,
        ) - (entry?.breakMinutes || 0),
      );
      if (
        entry?.actualMinutes != null &&
        (!previous.length || entry.actualMinutes !== clockMinutes)
      )
        throw new ConflictException(
          'За этот день часы внесены или исправлены вручную. Обратитесь к руководителю',
        );
      return tx.staffClockSession.create({
        data: {
          userId: actor.id,
          requestKey,
          date,
          startedAt: now,
          startIp: ip,
        },
      });
    });
  }
  async stop(actor: Actor, ip: string, sessionId: string) {
    this.permit(ip);
    return this.finish(actor.id, actor, ip, sessionId);
  }
  async closeByManager(
    userId: string,
    actor: Actor,
    ip: string,
    sessionId: string,
    endedAt: string,
    note: string,
  ) {
    if (!isManager(actor)) throw new ForbiddenException();
    if (!note.trim())
      throw new BadRequestException('Укажите причину ручного завершения');
    return this.finish(
      userId,
      actor,
      ip,
      sessionId,
      new Date(endedAt),
      note.trim(),
    );
  }
  private async finish(
    userId: string,
    actor: Actor,
    ip: string,
    sessionId: string,
    correction?: Date,
    note = '',
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'clock:' + userId}))`;
      const active = await tx.staffClockSession.findFirst({
        where: { userId, id: sessionId },
      });
      if (!active) throw new BadRequestException('Смена не найдена');
      if (active.endedAt) return active;
      const now = new Date(),
        endedAt = correction || now;
      const duration = endedAt.getTime() - active.startedAt.getTime();
      if (!Number.isFinite(duration) || duration < 0 || endedAt > now)
        throw new BadRequestException('Проверьте время окончания');
      if (duration > 24 * 3600000)
        throw new ConflictException(
          'Смена открыта больше суток. Руководитель должен указать фактическое время окончания',
        );
      const month = active.date.slice(0, 7);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'timesheet:' + userId + ':' + month}))`;
      const sheet = await tx.staffTimesheet.findUniqueOrThrow({
        where: { userId_month: { userId, month } },
      });
      if (sheet.approvedAt)
        throw new ConflictException(
          'Руководитель должен открыть утвержденный табель',
        );
      const closed = await tx.staffClockSession.update({
        where: { id: active.id },
        data: { endedAt, endIp: ip, closedById: actor.id, note },
      });
      const sessions = await tx.staffClockSession.findMany({
        where: { userId, date: active.date, endedAt: { not: null } },
      });
      const entry = await tx.staffTimeEntry.findUnique({
        where: { sheetId_date: { sheetId: sheet.id, date: active.date } },
      });
      const total = Math.floor(
        sessions.reduce(
          (sum, s) => sum + s.endedAt!.getTime() - s.startedAt.getTime(),
          0,
        ) / 60000,
      );
      const minutes = Math.max(0, total - (entry?.breakMinutes || 0));
      if (minutes > 1440)
        throw new BadRequestException(
          'Больше 24 часов за день — требуется корректировка руководителя',
        );
      const data = {
        actualMinutes: minutes,
        status: 'work',
        updatedById: actor.id,
        ...(note ? { note } : {}),
      };
      await tx.staffTimeEntry.upsert({
        where: { sheetId_date: { sheetId: sheet.id, date: active.date } },
        create: { sheetId: sheet.id, date: active.date, ...data },
        update: { ...data, revision: { increment: 1 } },
      });
      return closed;
    });
  }
}
