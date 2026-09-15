import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { enabledFeatures } from '../features/features.module';
import { PrismaService } from '../prisma/prisma.service';
import { AdmissionsService } from '../admissions/admissions.module';
import {
  ActivityDto,
  EnrollDto,
  LeadDto,
  LeadQuery,
  StageDto,
} from './crm.dto';
import type { Actor } from '../team/team.service';

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  const normalized =
    digits.length === 11 && ['7', '8'].includes(digits[0])
      ? '7' + digits.slice(1)
      : '';
  if (!normalized)
    throw new BadRequestException('Телефон: +7XXXXXXXXXX или 8XXXXXXXXXX');
  return '+' + normalized;
}
@Injectable()
export class CrmService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private logger = new Logger(CrmService.name);
  constructor(
    private prisma: PrismaService,
    private admissions: AdmissionsService,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      void this.remind().catch(() =>
        this.logger.error('CRM reminder processing failed'),
      );
    }, 30000);
    this.timer.unref?.();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async remind() {
    if (!enabledFeatures().crm) return;
    const now = new Date();
    const leads = await this.prisma.crmLead.findMany({
      where: { state: 'open', remindedAt: null, nextActionAt: { lte: now } },
      take: 100,
      orderBy: { nextActionAt: 'asc' },
    });
    for (const lead of leads)
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.crmLead.updateMany({
          where: {
            id: lead.id,
            revision: lead.revision,
            state: 'open',
            remindedAt: null,
          },
          data: { remindedAt: now },
        });
        if (!claimed.count) return;
        const owners = await tx.user.findMany({
          where: {
            role: { in: ['admin', 'superadmin'] },
            deletedAt: null,
            blockedAt: null,
            ...(lead.ownerId ? { id: lead.ownerId } : {}),
          },
          select: { id: true },
        });
        await tx.notification.createMany({
          data: owners.map((user) => ({
            userId: user.id,
            type: 'crm_contact',
            title: 'Пора связаться с семьёй',
            body: 'В CRM наступил срок следующего контакта. Откройте заявки родителей.',
            data: { url: '/crm' },
          })),
        });
      });
  }
  stages() {
    return this.prisma.crmStage.findMany({
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });
  }
  async createStage(dto: StageDto) {
    if (!dto.title.trim()) throw new BadRequestException('Укажите название');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('crm-stages'))`;
      const count = await tx.crmStage.count();
      if (count >= 50)
        throw new BadRequestException('Допускается до 50 этапов');
      const last = await tx.crmStage.aggregate({ _max: { position: true } });
      return tx.crmStage.create({
        data: {
          title: dto.title.trim(),
          kind: dto.kind,
          position: (last._max.position ?? -1) + 1,
        },
      });
    });
  }
  async renameStage(id: string, dto: StageDto) {
    if (!dto.title.trim()) throw new BadRequestException('Укажите название');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('crm-stages'))`;
      const stage = await tx.crmStage.findUnique({ where: { id } });
      if (!stage) throw new NotFoundException();
      if (
        stage.kind === 'active' &&
        dto.kind !== 'active' &&
        (await tx.crmStage.count({ where: { kind: 'active' } })) <= 1
      )
        throw new BadRequestException('Оставьте хотя бы один рабочий этап');
      return tx.crmStage.update({
        where: { id },
        data: { title: dto.title.trim(), kind: dto.kind },
      });
    });
  }
  async orderStages(ids: string[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('crm-stages'))`;
      const stages = await tx.crmStage.findMany();
      if (
        stages.length !== ids.length ||
        stages.some((s) => !ids.includes(s.id))
      )
        throw new ConflictException('Состав этапов изменился. Обновите доску');
      for (let i = 0; i < ids.length; i++)
        await tx.crmStage.update({
          where: { id: ids[i] },
          data: { position: i },
        });
      return { ok: true };
    });
  }
  async removeStage(id: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('crm-stages'))`;
      const stage = await tx.crmStage.findUnique({
        where: { id },
        include: { _count: { select: { leads: true } } },
      });
      if (!stage) throw new NotFoundException();
      if (stage._count.leads)
        throw new ConflictException('Сначала перенесите заявки с этого этапа');
      if (
        stage.kind === 'active' &&
        (await tx.crmStage.count({ where: { kind: 'active' } })) <= 1
      )
        throw new BadRequestException('Оставьте хотя бы один рабочий этап');
      return tx.crmStage.delete({ where: { id } });
    });
  }
  async lookups() {
    const [owners, groups, parents, children] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          role: { in: ['admin', 'superadmin'] },
          deletedAt: null,
          blockedAt: null,
        },
        select: { id: true, name: true },
      }),
      this.prisma.group.findMany({
        include: {
          _count: { select: { children: { where: { status: 'active' } } } },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.user.findMany({
        where: { role: 'parent', deletedAt: null, blockedAt: null },
        select: { id: true, name: true, email: true },
      }),
      this.prisma.child.findMany({
        select: {
          id: true,
          name: true,
          birthDate: true,
          parents: { select: { parentId: true } },
        },
      }),
    ]);
    return { owners, groups, parents, children };
  }
  list(q: LeadQuery) {
    return this.prisma.crmLead.findMany({
      where: {
        ...(q.state !== 'all' ? { state: q.state || 'open' } : {}),
        ...(q.ownerId ? { ownerId: q.ownerId } : {}),
        ...(q.search
          ? {
              OR: [
                { parentName: { contains: q.search, mode: 'insensitive' } },
                { phone: { contains: q.search.replace(/[ ()-]/g, '') } },
                { childName: { contains: q.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
  async detail(id: string) {
    const lead = await this.prisma.crmLead.findUnique({
      where: { id },
      include: { history: { orderBy: { createdAt: 'desc' } }, stage: true },
    });
    if (!lead) throw new NotFoundException();
    const enrollment = lead.enrollmentId
      ? await this.prisma.enrollment.findUnique({
          where: { id: lead.enrollmentId },
          include: { child: { select: { id: true, name: true } } },
        })
      : null;
    return { ...lead, enrollment };
  }
  private async leadData(dto: LeadDto) {
    if (!dto.parentName.trim())
      throw new BadRequestException('Укажите родителя');
    const birthDate = dto.birthDate
      ? new Date(dto.birthDate + 'T00:00:00Z')
      : null;
    if (
      birthDate &&
      (!Number.isFinite(birthDate.getTime()) ||
        birthDate.toISOString().slice(0, 10) !== dto.birthDate ||
        birthDate > new Date())
    )
      throw new BadRequestException('Проверьте дату рождения');
    if (
      dto.ownerId &&
      !(await this.prisma.user.findFirst({
        where: {
          id: dto.ownerId,
          role: { in: ['admin', 'superadmin'] },
          blockedAt: null,
          deletedAt: null,
        },
      }))
    )
      throw new BadRequestException('Выберите действующего администратора');
    return {
      parentName: dto.parentName.trim(),
      phone: normalizePhone(dto.phone),
      email: dto.email?.trim().toLowerCase() || null,
      childName: dto.childName.trim(),
      birthDate,
      direction: dto.direction,
      priority: dto.priority,
      ownerId: dto.ownerId || null,
      source: dto.source,
      utmSource: dto.utmSource,
      utmMedium: dto.utmMedium,
      utmCampaign: dto.utmCampaign,
      notes: dto.notes,
      nextActionAt: dto.nextActionAt ? new Date(dto.nextActionAt) : null,
      nextAction: dto.nextAction,
    };
  }
  private async lock(
    tx: Prisma.TransactionClient,
    id: string,
    revision?: number,
  ) {
    await tx.$queryRaw`SELECT id FROM "CrmLead" WHERE id = ${id} FOR UPDATE`;
    const lead = await tx.crmLead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException();
    if (lead.state === 'won')
      throw new ConflictException('Заявка уже зачислена');
    if (revision !== undefined && lead.revision !== revision)
      throw new ConflictException('Заявка изменена. Обновите карточку');
    return lead;
  }
  async create(dto: LeadDto, actor: Actor | null, externalKey?: string) {
    const data = await this.leadData(dto);
    return this.prisma.$transaction(async (tx) => {
      if (externalKey) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'intake:' + externalKey}))`;
        const old = await tx.crmLead.findUnique({ where: { externalKey } });
        if (old) return old;
      }
      const stage = await tx.crmStage.findFirst({
        where: { kind: 'active' },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
      });
      if (!stage) throw new BadRequestException('Добавьте рабочий этап');
      return tx.crmLead.create({
        data: {
          ...data,
          stageId: stage.id,
          externalKey,
          history: {
            create: {
              kind: 'created',
              text: 'Заявка создана',
              actorId: actor?.id,
            },
          },
        },
      });
    });
  }
  async update(id: string, dto: LeadDto, actor: Actor) {
    const data = await this.leadData(dto);
    return this.prisma.$transaction(async (tx) => {
      const lead = await this.lock(tx, id, dto.revision ?? -1);
      const changedReminder =
        lead.nextActionAt?.getTime() !== data.nextActionAt?.getTime() ||
        lead.ownerId !== data.ownerId;
      return tx.crmLead.update({
        where: { id },
        data: {
          ...data,
          ...(changedReminder ? { remindedAt: null } : {}),
          revision: { increment: 1 },
          history: {
            create: {
              kind: 'edited',
              text: 'Данные заявки изменены',
              actorId: actor.id,
            },
          },
        },
      });
    });
  }
  async move(id: string, stageId: string, revision: number, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      const lead = await this.lock(tx, id, revision);
      const stage = await tx.crmStage.findUnique({ where: { id: stageId } });
      if (!stage) throw new NotFoundException('Этап не найден');
      if (lead.stageId === stageId) return lead;
      return tx.crmLead.update({
        where: { id },
        data: {
          stageId,
          revision: { increment: 1 },
          history: {
            create: {
              kind: 'stage',
              text: 'Переход: ' + stage.title,
              actorId: actor.id,
            },
          },
        },
      });
    });
  }
  async activity(id: string, dto: ActivityDto, actor: Actor) {
    if (!dto.text.trim())
      throw new BadRequestException('Добавьте результат контакта');
    return this.prisma.$transaction(async (tx) => {
      const lead = await this.lock(tx, id, dto.revision);
      if (dto.addToCalendar) {
        if (!enabledFeatures().team)
          throw new BadRequestException('Календарь команды отключён');
        if (!dto.nextActionAt || new Date(dto.nextActionAt) <= new Date())
          throw new BadRequestException('Укажите будущую дату встречи');
        const start = new Date(dto.nextActionAt);
        await tx.teamEvent.create({
          data: {
            title: dto.nextAction || 'Встреча с семьёй',
            description: 'Заявка: ' + lead.parentName,
            kind: 'meeting',
            startsAt: start,
            endsAt: new Date(start.getTime() + 3600000),
            visibility: 'participants',
            authorId: actor.id,
            participantIds: [
              ...new Set([actor.id, ...(lead.ownerId ? [lead.ownerId] : [])]),
            ],
            reminderMinutes: 30,
          },
        });
      }
      return tx.crmLead.update({
        where: { id },
        data: {
          revision: { increment: 1 },
          ...(dto.nextActionAt !== undefined
            ? {
                nextActionAt: dto.nextActionAt
                  ? new Date(dto.nextActionAt)
                  : null,
                ...(lead.nextActionAt?.getTime() !==
                (dto.nextActionAt
                  ? new Date(dto.nextActionAt).getTime()
                  : undefined)
                  ? { remindedAt: null }
                  : {}),
              }
            : {}),
          ...(dto.nextAction !== undefined
            ? { nextAction: dto.nextAction }
            : {}),
          history: {
            create: {
              kind: dto.kind,
              text: dto.text.trim(),
              actorId: actor.id,
            },
          },
        },
      });
    });
  }
  async enroll(id: string, dto: EnrollDto, actor: Actor) {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "CrmLead" WHERE id = ${id} FOR UPDATE`;
        const lead = await tx.crmLead.findUnique({ where: { id } });
        if (!lead) throw new NotFoundException();
        if (lead.state === 'won' && lead.enrollmentId)
          return tx.enrollment.findUnique({
            where: { id: lead.enrollmentId },
            include: { child: true },
          });
        if (lead.revision !== dto.revision)
          throw new ConflictException('Заявка изменена. Обновите карточку');
        const enrollment = await this.admissions.enroll(
          tx,
          {
            ...dto,
            requestKey: 'lead:' + id,
            parentName: lead.parentName,
            phone: lead.phone,
            email: dto.email || lead.email || undefined,
          },
          actor.id,
        );
        await tx.crmLead.update({
          where: { id },
          data: {
            state: 'won',
            enrollmentId: enrollment.id,
            nextActionAt: null,
            nextAction: '',
            revision: { increment: 1 },
            history: {
              create: {
                kind: 'enrolled',
                text: 'Зачислен в группу. Начало: ' + dto.startsOn,
                actorId: actor.id,
              },
            },
          },
        });
        return enrollment;
      },
      { timeout: 15000 },
    );
  }
}
