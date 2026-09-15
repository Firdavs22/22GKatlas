import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { enabledFeatures } from '../features/features.module';
import { PrismaService } from '../prisma/prisma.service';
import { AdmissionsService } from '../admissions/admissions.module';
import { checkAdmission } from '../admissions/admission-check';
import { AuthService } from '../auth/auth.service';
import { MailService } from '../mail/mail.service';
import { parentInvite } from '../mail/mail.templates';
import {
  ActivityDto,
  EnrollDto,
  LeadDto,
  LeadQuery,
  StageDto,
  EnrollmentCheckDto,
} from './crm.dto';
import type { Actor } from '../team/team.service';
import { hasMessengerContact } from './intake-details';
import type { IntakeDetails } from './intake-details';

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
    private auth: AuthService,
    private mail: MailService,
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
            role: { in: ['admin', 'superadmin', 'director'] },
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
          role: { in: ['admin', 'superadmin', 'director'] },
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
                {
                  intakeDetails: {
                    path: ['contactSearch'],
                    string_contains: q.search.toLowerCase(),
                  },
                },
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
    const relatedLeads = lead.phone
      ? await this.prisma.crmLead.findMany({
          where: { phone: lead.phone, id: { not: lead.id } },
          select: { id: true, parentName: true, childName: true, state: true },
          take: 20,
        })
      : [];
    return { ...lead, enrollment, relatedLeads };
  }
  private async leadData(dto: LeadDto, allowMissingPhone = false) {
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
          role: { in: ['admin', 'superadmin', 'director'] },
          blockedAt: null,
          deletedAt: null,
        },
      }))
    )
      throw new BadRequestException('Выберите действующего администратора');
    return {
      parentName: dto.parentName.trim(),
      phone:
        !dto.phone.trim() && allowMissingPhone ? '' : normalizePhone(dto.phone),
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
  async create(
    dto: LeadDto,
    actor: Actor | null,
    externalKey?: string,
    intakeDetails?: IntakeDetails,
  ) {
    const data = await this.leadData(dto, hasMessengerContact(intakeDetails));
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
          ...(intakeDetails
            ? {
                intakeDetails: {
                  ...intakeDetails,
                  contactSearch: intakeDetails.contactValue.toLowerCase(),
                  receivedAt: new Date().toISOString(),
                },
              }
            : {}),
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
    return this.prisma.$transaction(async (tx) => {
      const lead = await this.lock(tx, id, dto.revision ?? -1);
      const data = await this.leadData(
        dto,
        hasMessengerContact(lead.intakeDetails),
      );
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
        if (!lead.phone)
          throw new BadRequestException(
            'Перед зачислением добавьте телефон родителя в данные заявки',
          );
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
  async checkEnrollment(id: string, dto: EnrollmentCheckDto) {
    const lead = await this.prisma.crmLead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException();
    if (lead.state === 'won')
      throw new ConflictException('Ребёнок уже зачислен');
    return checkAdmission(this.prisma, {
      ...dto,
      parentName: lead.parentName,
      phone: lead.phone,
      email: dto.email || lead.email || undefined,
    });
  }
  async inviteParent(id: string, actor: Actor) {
    const lead = await this.prisma.crmLead.findUnique({ where: { id } });
    if (!lead?.enrollmentId)
      throw new BadRequestException('Сначала зачислите ребёнка');
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: lead.enrollmentId },
      include: {
        child: { include: { parents: { include: { parent: true } } } },
      },
    });
    const parents = enrollment?.child.parents.map((p) => p.parent) || [];
    const parent =
      parents.find((p) => p.id === enrollment?.parentId) ||
      parents.find((p) => p.email === lead.email) ||
      (parents.length === 1 ? parents[0] : null);
    if (
      !parent ||
      parent.role !== 'parent' ||
      parent.blockedAt ||
      parent.deletedAt
    )
      throw new ConflictException(
        'Выберите действующего родителя в разделе «Родители»',
      );
    if (parent.consentGivenAt) return { status: 'active', email: parent.email };
    if (!process.env.SMTP_HOST)
      throw new ServiceUnavailableException(
        'Почта не настроена. Зачисление сохранено; настройте SMTP и повторите отправку',
      );
    const appUrl = process.env.PUBLIC_APP_URL || '';
    if (!/^https?:\/\/[^\s/]+/i.test(appUrl))
      throw new ServiceUnavailableException(
        'Не настроен адрес портала PUBLIC_APP_URL',
      );
    const token = this.auth.generateInviteToken(parent.id);
    const inviteUrl =
      appUrl.replace(/\/$/, '') + '/invite?token=' + encodeURIComponent(token);
    const message = parentInvite({
      parentName: parent.name,
      childName: enrollment!.child.name,
      inviteUrl,
    });
    try {
      const result = await this.mail.send({ to: parent.email, ...message });
      if (!result?.sent) throw new Error('SMTP disabled');
    } catch {
      throw new ServiceUnavailableException(
        'Письмо не отправлено. Зачисление сохранено; проверьте SMTP и повторите отправку',
      );
    }
    await this.prisma.crmActivity.create({
      data: {
        leadId: id,
        kind: 'invite',
        actorId: actor.id,
        text: 'Родителю отправлено приглашение в портал',
      },
    });
    return { status: 'sent', email: parent.email };
  }
}
