import { randomUUID } from 'crypto';
import { TeamService } from '../src/team/team.service';
import { CrmService } from '../src/crm/crm.service';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { Readable } from 'stream';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { FilesService } from '../src/files/files.service';
import { MailService } from '../src/mail/mail.service';
import { CsrfMiddleware } from '../src/common/csrf.middleware';
import { io, Socket } from '../../web/node_modules/socket.io-client';
import { ChatsGateway } from '../src/chats/chats.gateway';

// Never use DATABASE_URL here: integration tests require an explicitly isolated DB.
if (!process.env.SECURITY_TEST_DATABASE_URL)
  throw new Error(
    'Set SECURITY_TEST_DATABASE_URL to an isolated local globoatlas_security database',
  );
describe('Workspace modules integration (isolated PostgreSQL)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let url: string;
  let cookies: string[];
  let csrf: string;
  const password = 'Local-security-test-123';
  const sentMail = jest.fn();
  const fileStream = jest.fn(() =>
    Promise.resolve(Readable.from(Buffer.from('test-file'))),
  );
  const sockets: Socket[] = [];
  const token = (id: string, type = 'access') =>
    jwt.sign({ sub: id, type }, { expiresIn: '15m' });
  const auth = (id = 'parent-a') => ({ Authorization: `Bearer ${token(id)}` });
  function setCookies(response: any) {
    const jar = new Map(
      (cookies || []).map((item) => [item.split('=')[0], item]),
    );
    for (const item of response.headers['set-cookie'] || [])
      jar.set(item.split('=')[0], item.split(';')[0]);
    cookies = [...jar.values()];
    csrf = decodeURIComponent(
      jar.get('XSRF-TOKEN')?.slice('XSRF-TOKEN='.length) || '',
    );
  }
  function connect(options: Record<string, any>) {
    const socket = io(url, {
      transports: ['websocket'],
      reconnection: false,
      ...options,
    });
    sockets.push(socket);
    return socket;
  }
  function event(socket: Socket, name: string) {
    return new Promise<any>((resolve) => socket.once(name, resolve));
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'integration-test-only-secret';
    const database = new URL(process.env.SECURITY_TEST_DATABASE_URL!);
    if (
      !['127.0.0.1', 'localhost'].includes(database.hostname) ||
      database.pathname !== '/globoatlas_security'
    ) {
      throw new Error(
        'Security tests only run against a local database named globoatlas_security',
      );
    }
    prisma = new PrismaService({
      datasources: { db: { url: process.env.SECURITY_TEST_DATABASE_URL! } },
    });
    await prisma.$connect();
    // Each run uses a fresh fixture transaction; IDs make repeat runs deterministic.
    const tables = await prisma.$queryRaw<
      { tablename: string }[]
    >`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    // Table names come only from PostgreSQL's own catalog, never from user input.
    for (const { tablename } of tables)
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "${tablename.replace(/"/g, '""')}" CASCADE`,
      );
    const hash = await bcrypt.hash(password, 4);
    for (const [id, role] of [
      ['teacher-a', 'teacher'],
      ['parent-a', 'parent'],
      ['parent-b', 'parent'],
      ['specialist', 'psychologist'],
      ['methodist', 'methodist'],
      ['teacher-b', 'teacher'],
      ['teacher-clock', 'teacher'],
      ['director', 'director'],
      ['admin', 'superadmin'],
    ] as const) {
      await prisma.user.create({
        data: {
          id,
          email: `${id}@example.invalid`,
          name: id,
          role,
          password: hash,
          consentGivenAt: new Date(),
        },
      });
    }
    await prisma.group.create({
      data: {
        id: 'group-a',
        name: 'A',
        ageRange: '3-6',
        year: 2026,
        teacherId: 'teacher-a',
      },
    });
    await prisma.user.create({
      data: {
        id: 'manager',
        name: 'Manager',
        email: 'manager@example.invalid',
        role: 'admin',
        password: hash,
      },
    });
    await prisma.crmStage.createMany({
      data: [
        { id: 'new', title: 'Новая', kind: 'active', position: 0 },
        { id: 'tour', title: 'Экскурсия', kind: 'active', position: 1 },
        { id: 'lost', title: 'Отказ', kind: 'lost', position: 2 },
      ],
    });
    for (const [id, parentId] of [
      ['child-a', 'parent-a'],
      ['child-b', 'parent-b'],
    ]) {
      await prisma.child.create({
        data: {
          id,
          name: id,
          birthDate: new Date('2022-01-01'),
          groupId: id === 'child-a' ? 'group-a' : null,
          parents: { create: { parentId } },
        },
      });
    }
    await prisma.observation.create({
      data: {
        id: 'hidden',
        childId: 'child-a',
        userId: 'teacher-a',
        text: 'hidden',
        photos: ['/api/files/hidden.jpg'],
        tags: [],
        visible: false,
      },
    });
    await prisma.observation.create({
      data: {
        childId: 'child-a',
        userId: 'teacher-a',
        text: 'shared',
        photos: ['https://old-host.invalid/api/files/shared.jpg'],
        tags: [],
        visible: true,
      },
    });
    await prisma.feedItem.create({
      data: {
        authorId: 'teacher-a',
        type: 'group_news',
        scope: 'group',
        groupId: 'group-a',
        mediaUrls: ['/api/files/group.jpg'],
      },
    });
    await prisma.specialistNote.create({
      data: {
        childId: 'child-a',
        specialistId: 'specialist',
        type: 'observation',
        text: 'private',
        visibility: 'specialist_only',
        attachments: ['/api/files/note.pdf'],
      },
    });
    await prisma.fileMeta.create({
      data: {
        filename: 'draft.jpg',
        uploaderId: 'teacher-a',
        scope: 'uploader',
      },
    });
    await prisma.chatRoom.create({
      data: {
        id: 'chat-a',
        type: 'teacher_parent',
        participants: {
          create: [{ userId: 'parent-a' }, { userId: 'teacher-a' }],
        },
        messages: {
          create: {
            senderId: 'teacher-a',
            text: 'hello',
            attachments: ['/api/files/chat.pdf'],
          },
        },
      },
    });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(FilesService)
      .useValue({ getFileStream: fileStream })
      .overrideProvider(MailService)
      .useValue({ send: sentMail })
      .compile();
    app = module.createNestApplication<NestExpressApplication>();
    app.useLogger(false);
    app.use(cookieParser());
    app.use(json());
    app.use(urlencoded({ extended: false }));
    app.use(new CsrfMiddleware().use);
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
    jwt = app.get(JwtService);
  }, 30000);
  afterAll(async () => {
    sockets.forEach((socket) => socket.disconnect());
    await app?.close();
    await prisma?.$disconnect();
  });

  it('protects staff directory and personal timesheets', async () => {
    await request(url).get('/api/team/staff').set(auth()).expect(403);
    await request(url)
      .get('/api/team/timesheet?month=2026-09&userId=teacher-b')
      .set(auth('teacher-a'))
      .expect(403);
    await request(url)
      .get('/api/team/timesheet?month=2026-13')
      .set(auth('teacher-a'))
      .expect(400);
  });
  it('keeps planned and actual hours separate, rejects stale writes and locks approved sheets', async () => {
    const row = {
      date: '2026-09-15',
      plannedStart: '09:00',
      plannedEnd: '18:00',
      breakMinutes: 60,
      actualMinutes: 480,
      status: 'work',
      note: '',
      revision: 0,
    };
    const saved = await request(url)
      .put('/api/team/timesheet/teacher-a')
      .set(auth('admin'))
      .send(row)
      .expect(200);
    expect(saved.body.plannedMinutes).toBe(480);
    await request(url)
      .put('/api/team/timesheet/teacher-a')
      .set(auth('teacher-a'))
      .send({ ...row, revision: 1 })
      .expect(403);
    const actual = {
      date: row.date,
      actualMinutes: 450,
      status: 'work',
      note: 'Корректировка',
      revision: 1,
    };
    await request(url)
      .put('/api/team/timesheet/teacher-a')
      .set(auth('teacher-a'))
      .send(actual)
      .expect(200);
    await request(url)
      .put('/api/team/timesheet/teacher-a')
      .set(auth('teacher-a'))
      .send(actual)
      .expect(409);
    await request(url)
      .post('/api/team/timesheet/approve')
      .set(auth('teacher-a'))
      .send({ month: '2026-09' })
      .expect(403);
    await request(url)
      .post('/api/team/timesheet/approve')
      .set(auth('admin'))
      .send({ month: '2026-09', userId: 'teacher-a' })
      .expect(201);
    await request(url)
      .put('/api/team/timesheet/teacher-a')
      .set(auth('teacher-a'))
      .send({ ...actual, revision: 2 })
      .expect(409);
    const sheet = await request(url)
      .get('/api/team/timesheet?month=2026-09')
      .set(auth('teacher-a'))
      .expect(200);
    expect(sheet.body.entries[0]).toMatchObject({
      actualMinutes: 450,
      plannedMinutes: 480,
    });
    await request(url)
      .get('/api/team/timesheet/export?month=2026-09')
      .set(auth('teacher-a'))
      .expect(200)
      .expect('Content-Type', /spreadsheetml/);
    await request(url)
      .post('/api/team/timesheet/reopen')
      .set(auth('admin'))
      .send({ month: '2026-09', userId: 'teacher-a' })
      .expect(201);
  });
  it('validates overnight work and real calendar dates', async () => {
    const row = {
      date: '2026-09-16',
      plannedStart: '22:00',
      plannedEnd: '06:00',
      breakMinutes: 30,
      actualMinutes: 450,
      status: 'work',
      note: '',
      revision: 0,
    };
    const saved = await request(url)
      .put('/api/team/timesheet/teacher-a')
      .set(auth('admin'))
      .send(row)
      .expect(200);
    expect(saved.body.plannedMinutes).toBe(450);
    await request(url)
      .put('/api/team/timesheet/teacher-a')
      .set(auth('admin'))
      .send({ ...row, date: '2026-02-30' })
      .expect(400);
    await request(url)
      .put('/api/team/timesheet/teacher-a')
      .set(auth('admin'))
      .send({ ...row, date: '2026-09-17', status: 'sick' })
      .expect(400);
  });
  it('keeps private calendar events private and prevents editing by participants', async () => {
    const dto = {
      title: 'Встреча',
      description: 'План',
      kind: 'meeting',
      startsAt: '2026-09-18T09:00:00Z',
      endsAt: '2026-09-18T10:00:00Z',
      visibility: 'participants',
      participantIds: ['specialist'],
      reminderMinutes: 30,
    };
    const created = await request(url)
      .post('/api/team/events')
      .set(auth('teacher-a'))
      .send(dto)
      .expect(201);
    const query = '/api/team/events?from=2026-09-01&to=2026-10-01';
    expect(
      (await request(url).get(query).set(auth('teacher-b')).expect(200)).body,
    ).toHaveLength(0);
    expect(
      (await request(url).get(query).set(auth('specialist')).expect(200)).body,
    ).toHaveLength(1);
    await request(url).get(query).set(auth()).expect(403);
    await request(url)
      .put('/api/team/events/' + created.body.id)
      .set(auth('specialist'))
      .send({ ...dto, revision: 1 })
      .expect(403);
    await request(url)
      .put('/api/team/events/' + created.body.id)
      .set(auth('teacher-a'))
      .send({ ...dto, revision: 1, visibility: 'staff' })
      .expect(200);
    expect(
      (await request(url).get(query).set(auth('teacher-b')).expect(200)).body,
    ).toHaveLength(1);
    await request(url)
      .post('/api/team/events/' + created.body.id + '/cancel')
      .set(auth('admin'))
      .send({ revision: 2 })
      .expect(201);
    expect(
      (await request(url).get(query).set(auth('admin')).expect(200)).body,
    ).toHaveLength(0);
  });
  it('delivers calendar reminders once to the correct staff', async () => {
    const start = new Date(Date.now() + 10 * 60000),
      end = new Date(Date.now() + 20 * 60000);
    await request(url)
      .post('/api/team/events')
      .set(auth('methodist'))
      .send({
        title: 'Напоминание',
        description: '',
        kind: 'meeting',
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        visibility: 'participants',
        participantIds: ['teacher-a'],
        reminderMinutes: 15,
      })
      .expect(201);
    const service = app.get(TeamService);
    await Promise.all([service.remind(), service.remind()]);
    expect(
      await prisma.notification.count({
        where: { type: 'team_event', userId: 'teacher-a' },
      }),
    ).toBe(1);
    expect(
      await prisma.notification.count({
        where: { type: 'team_event', userId: 'parent-a' },
      }),
    ).toBe(0);
  });
  it('publishes rules to everyone, restricts curriculum and revokes direct file access', async () => {
    await prisma.fileMeta.create({
      data: {
        filename: 'curriculum.pdf',
        uploaderId: 'methodist',
        scope: 'uploader',
      },
    });
    const dto = {
      title: 'Учебный план',
      kind: 'curriculum',
      body: 'Работа педагогов',
      audience: 'teachers',
      published: false,
      attachments: ['/api/files/curriculum.pdf'],
      links: [],
    };
    await request(url)
      .post('/api/library')
      .set(auth('teacher-a'))
      .send(dto)
      .expect(403);
    const created = await request(url)
      .post('/api/library')
      .set(auth('methodist'))
      .send(dto)
      .expect(201);
    await request(url)
      .get('/api/library/' + created.body.id)
      .set(auth('teacher-a'))
      .expect(404);
    await request(url)
      .put('/api/library/' + created.body.id)
      .set(auth('methodist'))
      .send({ ...dto, published: true, revision: 1 })
      .expect(200);
    await request(url)
      .get('/api/library/' + created.body.id)
      .set(auth('teacher-a'))
      .expect(200);
    await request(url)
      .get('/api/files/curriculum.pdf')
      .set(auth('teacher-a'))
      .expect(200);
    await request(url)
      .get('/api/library/' + created.body.id)
      .set(auth())
      .expect(404);
    await request(url).get('/api/files/curriculum.pdf').set(auth()).expect(403);
    expect(
      (await request(url).get('/api/library').set(auth()).expect(200)).body,
    ).toHaveLength(0);
    // Even a copied URL in a public record does not override document visibility.
    await prisma.feedItem.create({
      data: {
        type: 'school_news',
        scope: 'school',
        authorId: 'teacher-a',
        mediaUrls: ['/api/files/curriculum.pdf'],
      },
    });
    await request(url).get('/api/files/curriculum.pdf').set(auth()).expect(403);
    await request(url)
      .put('/api/library/' + created.body.id)
      .set(auth('methodist'))
      .send({ ...dto, published: false, revision: 2 })
      .expect(200);
    await request(url)
      .get('/api/files/curriculum.pdf')
      .set(auth('teacher-a'))
      .expect(403);
    const rules = await request(url)
      .post('/api/library')
      .set(auth('methodist'))
      .send({
        ...dto,
        title: 'Правила сада',
        kind: 'policy',
        audience: 'all',
        published: true,
        attachments: [],
      })
      .expect(201);
    await request(url)
      .get('/api/library/' + rules.body.id)
      .set(auth())
      .expect(200);
  });
  it('disables optional modules without breaking the core portal', async () => {
    process.env.TEAM_ENABLED = 'false';
    process.env.LIBRARY_ENABLED = 'false';
    try {
      await request(url)
        .get('/api/team/staff')
        .set(auth('teacher-a'))
        .expect(404);
      await request(url).get('/api/library').set(auth()).expect(404);
      await request(url).get('/api/me').set(auth()).expect(200);
    } finally {
      delete process.env.TEAM_ENABLED;
      delete process.env.LIBRARY_ENABLED;
    }
  });

  const leadDto = (changes: Record<string, unknown> = {}) => ({
    parentName: 'Тестовая семья',
    phone: '8 (999) 123-45-67',
    email: 'crm-parent@example.invalid',
    childName: 'Тестовый ребенок',
    birthDate: '2022-03-01',
    direction: 'Сад',
    priority: 'normal',
    source: 'Сайт',
    utmSource: 'test',
    utmMedium: '',
    utmCampaign: '',
    notes: '',
    nextAction: '',
    ...changes,
  });
  let leadId: string;
  it('restricts CRM access, normalizes phones and tracks transitions with conflict protection', async () => {
    for (const id of ['parent-a', 'teacher-a', 'methodist'])
      await request(url).get('/api/crm/leads').set(auth(id)).expect(403);
    await request(url)
      .post('/api/crm/stages')
      .set(auth('manager'))
      .send({ title: 'Нельзя', kind: 'active' })
      .expect(403);
    const lead = await request(url)
      .post('/api/crm/leads')
      .set(auth('manager'))
      .send(leadDto())
      .expect(201);
    leadId = lead.body.id;
    expect(lead.body).toMatchObject({
      phone: '+79991234567',
      stageId: 'new',
      revision: 1,
    });
    await request(url)
      .post(`/api/crm/leads/${leadId}/move`)
      .set(auth('manager'))
      .send({ stageId: 'tour', revision: 1 })
      .expect(201);
    await request(url)
      .post(`/api/crm/leads/${leadId}/move`)
      .set(auth('manager'))
      .send({ stageId: 'lost', revision: 1 })
      .expect(409);
    const detail = await request(url)
      .get('/api/crm/leads/' + leadId)
      .set(auth('manager'))
      .expect(200);
    expect(detail.body.history.map((h: any) => h.kind)).toEqual([
      'stage',
      'created',
    ]);
    await request(url)
      .post('/api/crm/leads')
      .set(auth('admin'))
      .send(leadDto({ phone: '123' }))
      .expect(400);
  });
  it('uses configurable stages, protects occupied stages and retains a working entry stage', async () => {
    const stage = await request(url)
      .post('/api/crm/stages')
      .set(auth('admin'))
      .send({ title: 'Знакомство', kind: 'active' })
      .expect(201);
    await request(url)
      .put('/api/crm/stages/order')
      .set(auth('admin'))
      .send({ ids: ['new', stage.body.id, 'tour', 'lost'] })
      .expect(200);
    const stages = (
      await request(url).get('/api/crm/stages').set(auth('manager')).expect(200)
    ).body;
    expect(stages.map((s: any) => s.title)).toEqual([
      'Новая',
      'Знакомство',
      'Экскурсия',
      'Отказ',
    ]);
    await request(url)
      .delete('/api/crm/stages/tour')
      .set(auth('admin'))
      .expect(409);
    await request(url)
      .delete('/api/crm/stages/' + stage.body.id)
      .set(auth('admin'))
      .expect(200);
    await request(url)
      .put('/api/crm/stages/tour')
      .set(auth('admin'))
      .send({ title: 'Позже', kind: 'deferred' })
      .expect(200);
    await request(url)
      .put('/api/crm/stages/new')
      .set(auth('admin'))
      .send({ title: 'Позже', kind: 'deferred' })
      .expect(400);
  });
  it('records contact results and creates private calendar appointments only when enabled', async () => {
    const dto = {
      kind: 'tour',
      text: 'Согласована встреча',
      nextAction: 'Экскурсия',
      nextActionAt: new Date(Date.now() + 7200000).toISOString(),
      addToCalendar: true,
      revision: 2,
    };
    await request(url)
      .post(`/api/crm/leads/${leadId}/activity`)
      .set(auth('manager'))
      .send(dto)
      .expect(201);
    expect(
      await prisma.teamEvent.findFirst({ where: { authorId: 'manager' } }),
    ).toMatchObject({
      visibility: 'participants',
      participantIds: ['manager'],
    });
    process.env.TEAM_ENABLED = 'false';
    try {
      await request(url)
        .post(`/api/crm/leads/${leadId}/activity`)
        .set(auth('manager'))
        .send({ ...dto, revision: 3 })
        .expect(400);
      await request(url)
        .post(`/api/crm/leads/${leadId}/activity`)
        .set(auth('manager'))
        .send({ ...dto, revision: 3, addToCalendar: false })
        .expect(201);
    } finally {
      delete process.env.TEAM_ENABLED;
    }
  });
  it('sends overdue contact reminders once and only to responsible administrators', async () => {
    await request(url)
      .post('/api/crm/leads')
      .set(auth('admin'))
      .send(
        leadDto({
          ownerId: 'manager',
          nextActionAt: new Date(Date.now() - 60000).toISOString(),
          nextAction: 'Позвонить',
        }),
      )
      .expect(201);
    await Promise.all([
      app.get(CrmService).remind(),
      app.get(CrmService).remind(),
    ]);
    expect(
      await prisma.notification.count({
        where: { type: 'crm_contact', userId: 'manager' },
      }),
    ).toBe(1);
    expect(
      await prisma.notification.count({
        where: { type: 'crm_contact', userId: 'teacher-a' },
      }),
    ).toBe(0);
  });
  it('enrolls atomically and idempotently into the core group with parent access, dates and fee', async () => {
    const dto = {
      groupId: 'group-a',
      startsOn: '2026-10-01',
      monthlyFee: 65000,
      childName: 'Тестовый ребенок',
      birthDate: '2022-03-01',
      revision: 4,
    };
    const [first, repeated] = await Promise.all([
      request(url)
        .post(`/api/crm/leads/${leadId}/enroll`)
        .set(auth('manager'))
        .send(dto),
      request(url)
        .post(`/api/crm/leads/${leadId}/enroll`)
        .set(auth('manager'))
        .send(dto),
    ]);
    expect(first.status).toBe(201);
    expect(repeated.status).toBe(201);
    expect(first.body.id).toBe(repeated.body.id);
    expect(await prisma.enrollment.count()).toBe(1);
    const child = first.body.child;
    expect(child).toMatchObject({
      groupId: 'group-a',
      monthlyFee: '65000',
      inAdaptation: true,
      status: 'active',
    });
    expect(child.enrolledAt).toBe('2026-10-01T00:00:00.000Z');
    await request(url)
      .get('/api/admin/children/' + child.id)
      .set(auth('manager'))
      .expect(200);
    const parent = await prisma.user.findUniqueOrThrow({
      where: { email: 'crm-parent@example.invalid' },
    });
    expect(child.parents[0].parentId).toBe(parent.id);
    expect(
      (
        await request(url)
          .get('/api/crm/leads')
          .set(auth('manager'))
          .expect(200)
      ).body.some((l: any) => l.id === leadId),
    ).toBe(false);
    expect(
      (
        await request(url)
          .get('/api/crm/leads?state=won')
          .set(auth('manager'))
          .expect(200)
      ).body.some((l: any) => l.id === leadId),
    ).toBe(true);
    await request(url)
      .post(`/api/crm/leads/${leadId}/move`)
      .set(auth('manager'))
      .send({ stageId: 'lost', revision: 5 })
      .expect(409);
    expect(sentMail).not.toHaveBeenCalled();
  });
  it('prevents duplicate children and concurrent overbooking with complete rollback', async () => {
    const duplicate = (
      await request(url)
        .post('/api/crm/leads')
        .set(auth('manager'))
        .send(leadDto())
        .expect(201)
    ).body;
    const dto = {
      groupId: 'group-a',
      startsOn: '2026-10-01',
      childName: 'Тестовый ребенок',
      birthDate: '2022-03-01',
      revision: 1,
    };
    await request(url)
      .post(`/api/crm/leads/${duplicate.id}/enroll`)
      .set(auth('manager'))
      .send(dto)
      .expect(409);
    await prisma.group.create({
      data: {
        id: 'last-seat',
        name: 'Последнее место',
        ageRange: '3-6',
        year: 2026,
        capacity: 1,
      },
    });
    const a = (
      await request(url)
        .post('/api/crm/leads')
        .set(auth('manager'))
        .send(leadDto({ email: 'seat-a@example.invalid', childName: 'A' }))
        .expect(201)
    ).body;
    const b = (
      await request(url)
        .post('/api/crm/leads')
        .set(auth('manager'))
        .send(leadDto({ email: 'seat-b@example.invalid', childName: 'B' }))
        .expect(201)
    ).body;
    const results = await Promise.all(
      [a, b].map((l) =>
        request(url)
          .post(`/api/crm/leads/${l.id}/enroll`)
          .set(auth('manager'))
          .send({ ...dto, groupId: 'last-seat', childName: l.childName }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await prisma.child.count({ where: { groupId: 'last-seat' } })).toBe(
      1,
    );
    expect(
      await prisma.user.count({
        where: {
          email: { in: ['seat-a@example.invalid', 'seat-b@example.invalid'] },
        },
      }),
    ).toBe(1);
  });
  it('accepts authenticated idempotent website intake and leaves core enrollment usable with CRM off', async () => {
    await request(url).post('/api/crm/intake').send(leadDto()).expect(403);
    await request(url)
      .post('/api/crm/intake')
      .set('Authorization', 'Bearer invalid-connector-token')
      .send(leadDto())
      .expect(401);
    process.env.CRM_WEBHOOK_TOKEN =
      'test-only-webhook-token-at-least-32-characters';
    try {
      const intake = () =>
        request(url)
          .post('/api/crm/intake')
          .set('Authorization', 'Bearer ' + process.env.CRM_WEBHOOK_TOKEN)
          .set('X-Request-Id', 'website-request-123')
          .send(leadDto({ ownerId: 'manager' }));
      const first = await intake().expect(201),
        second = await intake().expect(201);
      expect(first.body.id).toBe(second.body.id);
      expect(first.body.ownerId).toBeNull();
      process.env.CRM_ENABLED = 'false';
      await intake().expect(404);
      await request(url).get('/api/crm/leads').set(auth('manager')).expect(404);
      await request(url)
        .post('/api/admin/children/child-b/enroll')
        .set(auth('manager'))
        .send({ groupId: 'group-a' })
        .expect(201);
      await request(url).get('/api/me').set(auth('parent-b')).expect(200);
    } finally {
      delete process.env.CRM_WEBHOOK_TOKEN;
      delete process.env.CRM_ENABLED;
    }
  });

  it('lets directors manage ordinary staff but not owners, peers or their own role', async () => {
    await request(url)
      .get('/api/admin/staff')
      .set(auth('director'))
      .expect(200);
    await request(url)
      .post('/api/admin/skills/reset-all')
      .set(auth('director'))
      .send({})
      .expect(403);
    for (const id of ['admin', 'director']) {
      await request(url)
        .put('/api/admin/staff/' + id)
        .set(auth('director'))
        .send({ name: 'Changed' })
        .expect(403);
      await request(url)
        .post('/api/admin/staff/' + id + '/resend-invite')
        .set(auth('director'))
        .expect(403);
    }
    await request(url)
      .put('/api/admin/staff/teacher-clock')
      .set(auth('director'))
      .send({ role: 'director' })
      .expect(403);
    await request(url)
      .put('/api/admin/staff/teacher-clock')
      .set(auth('director'))
      .send({ role: 'superadmin' })
      .expect(400);
    await request(url)
      .put('/api/admin/staff/teacher-clock')
      .set(auth('director'))
      .send({ name: 'Clock Teacher' })
      .expect(200);
    await request(url)
      .patch('/api/admin/staff/teacher-clock/block')
      .set(auth('director'))
      .expect(200);
    await request(url)
      .get('/api/team/clock')
      .set(auth('teacher-clock'))
      .expect(401);
    await request(url)
      .patch('/api/admin/staff/teacher-clock/unblock')
      .set(auth('director'))
      .expect(200);
  });

  it('records server clock times with IP enforcement, safe retries and controlled corrections', async () => {
    const keys = [
      'TEAM_CLOCK_ENABLED',
      'TEAM_WORKPLACE_CIDRS',
      'TEAM_TIMEZONE',
    ];
    const previous = keys.map((k) => process.env[k]);
    process.env.TEAM_CLOCK_ENABLED = 'true';
    process.env.TEAM_TIMEZONE = 'Europe/Moscow';
    process.env.TEAM_WORKPLACE_CIDRS = '203.0.113.7';
    try {
      const start = (id: string) =>
        request(url)
          .post('/api/team/clock/start')
          .set(auth('teacher-clock'))
          .send({ requestId: id });
      await start(randomUUID())
        .set('X-Forwarded-For', '203.0.113.7')
        .expect(403);
      process.env.TEAM_WORKPLACE_CIDRS = '127.0.0.1';
      const requestId = randomUUID(),
        before = Date.now();
      const attempts = await Promise.all([start(requestId), start(requestId)]);
      expect(attempts.map((r) => r.status)).toEqual([201, 201]);
      expect(attempts[0].body.id).toBe(attempts[1].body.id);
      const session = attempts[0].body;
      expect(new Date(session.startedAt).getTime()).toBeGreaterThanOrEqual(
        before,
      );
      expect(
        await prisma.staffClockSession.count({
          where: { userId: 'teacher-clock', endedAt: null },
        }),
      ).toBe(1);
      const row = {
        date: session.date,
        status: 'work',
        actualMinutes: 480,
        note: '',
        revision: 0,
      };
      await request(url)
        .put('/api/team/timesheet/teacher-clock')
        .set(auth('teacher-clock'))
        .send(row)
        .expect(403);
      await request(url)
        .post('/api/team/timesheet/approve')
        .set(auth('director'))
        .send({ month: session.date.slice(0, 7), userId: 'teacher-clock' })
        .expect(409);
      const stopped = await request(url)
        .post('/api/team/clock/stop')
        .set(auth('teacher-clock'))
        .send({ sessionId: session.id })
        .expect(201);
      const second = (await start(randomUUID()).expect(201)).body;
      await request(url)
        .post('/api/team/clock/stop')
        .set(auth('teacher-clock'))
        .send({ sessionId: session.id })
        .expect(201);
      expect(
        (
          await prisma.staffClockSession.findUniqueOrThrow({
            where: { id: second.id },
          })
        ).endedAt,
      ).toBeNull();
      expect((await start(requestId).expect(201)).body.id).toBe(session.id);
      process.env.TEAM_WORKPLACE_CIDRS = '203.0.113.7';
      await request(url)
        .post('/api/team/clock/stop')
        .set(auth('teacher-clock'))
        .send({ sessionId: second.id })
        .expect(403);
      const close = {
        sessionId: second.id,
        endedAt: new Date().toISOString(),
        note: 'Сотрудник забыл завершить смену',
      };
      await request(url)
        .post('/api/team/clock/teacher-clock/close')
        .set(auth('director'))
        .send({ ...close, note: '' })
        .expect(400);
      await request(url)
        .post('/api/team/clock/teacher-clock/close')
        .set(auth('director'))
        .send(close)
        .expect(201);
      const sheet = (
        await request(url)
          .get('/api/team/timesheet')
          .query({ month: session.date.slice(0, 7), userId: 'teacher-clock' })
          .set(auth('director'))
          .expect(200)
      ).body;
      expect(sheet.clockSessions).toHaveLength(2);
      expect(sheet.entries[0].actualMinutes).toBe(0);
      await request(url)
        .put('/api/team/timesheet/teacher-clock')
        .set(auth('director'))
        .send({ ...row, revision: sheet.entries[0].revision })
        .expect(400);
      await request(url)
        .put('/api/team/timesheet/teacher-clock')
        .set(auth('director'))
        .send({
          ...row,
          revision: sheet.entries[0].revision,
          note: 'Исправление по журналу присутствия',
        })
        .expect(200);
      process.env.TEAM_WORKPLACE_CIDRS = '127.0.0.1';
      await start(randomUUID()).expect(409);
      expect(
        (
          await prisma.staffClockSession.findUniqueOrThrow({
            where: { id: session.id },
          })
        ).endedAt!.toISOString(),
      ).toBe(stopped.body.endedAt);
    } finally {
      keys.forEach((key, i) => {
        if (previous[i] === undefined) delete process.env[key];
        else process.env[key] = previous[i];
      });
    }
  });

  it('takes a Tilda family through stages, checklist, enrollment, invitation and isolated parent access', async () => {
    const keys = ['TILDA_WEBHOOK_TOKEN', 'SMTP_HOST', 'PUBLIC_APP_URL'];
    const previous = keys.map((k) => process.env[k]);
    process.env.TILDA_WEBHOOK_TOKEN =
      'test-only-tilda-connector-token-at-least-32-characters';
    process.env.PUBLIC_APP_URL = 'https://portal.example.invalid';
    sentMail.mockClear();
    try {
      const post = (body: object) =>
        request(url)
          .post('/api/crm/tilda')
          .set('Authorization', 'Bearer ' + process.env.TILDA_WEBHOOK_TOKEN)
          .type('form')
          .send(body);
      await post({ test: 'test' }).expect(200, 'ok');
      const form = {
        tranid: 'site:complete-journey',
        Name: 'Тест Tilda',
        Phone: '8 (999) 555-66-77',
        Email: 'tilda-family@example.invalid',
      };
      const attempts = await Promise.all([post(form), post(form)]);
      expect(attempts.map((r) => r.status)).toEqual([200, 200]);
      expect(await prisma.crmLead.count({ where: { email: form.Email } })).toBe(
        1,
      );
      const lead = await prisma.crmLead.findFirstOrThrow({
        where: { email: form.Email },
      });
      const missing = (
        await request(url)
          .post(`/api/crm/leads/${lead.id}/enrollment-check`)
          .set(auth('director'))
          .send({})
          .expect(201)
      ).body;
      expect(missing.ready).toBe(false);
      expect(missing.missing).toContain('Имя ребенка');
      await request(url)
        .post(`/api/crm/leads/${lead.id}/enroll`)
        .set(auth('director'))
        .send({ revision: 1 })
        .expect(400);
      await request(url)
        .post(`/api/crm/leads/${lead.id}/move`)
        .set(auth('director'))
        .send({ stageId: 'tour', revision: 1 })
        .expect(201);
      const fields = {
        groupId: 'group-a',
        startsOn: '2026-10-01',
        childName: 'Ребенок Tilda',
        birthDate: '2022-04-01',
      };
      const checked = (
        await request(url)
          .post(`/api/crm/leads/${lead.id}/enrollment-check`)
          .set(auth('director'))
          .send(fields)
          .expect(201)
      ).body;
      expect(checked.ready).toBe(true);
      const admitted = (
        await request(url)
          .post(`/api/crm/leads/${lead.id}/enroll`)
          .set(auth('director'))
          .send({ ...fields, revision: 2 })
          .expect(201)
      ).body;
      delete process.env.SMTP_HOST;
      await request(url)
        .post(`/api/crm/leads/${lead.id}/invite-parent`)
        .set(auth('director'))
        .expect(503);
      expect(
        await prisma.enrollment.count({ where: { id: admitted.id } }),
      ).toBe(1);
      process.env.SMTP_HOST = 'smtp.example.invalid';
      sentMail.mockResolvedValue({ sent: true });
      await request(url)
        .post(`/api/crm/leads/${lead.id}/invite-parent`)
        .set(auth('director'))
        .expect(201);
      const message = sentMail.mock.calls[0][0];
      expect(message.to).toBe(form.Email);
      const invitation =
        /https:\/\/portal\.example\.invalid\/invite\?token=([^\s]+)/.exec(
          message.text,
        )![1];
      await request(url)
        .post('/api/auth/invite/accept')
        .send({
          token: decodeURIComponent(invitation),
          password,
          consent: true,
        })
        .expect(201);
      const login = (
        await request(url)
          .post('/api/auth/login')
          .send({ email: form.Email, password })
          .expect(201)
      ).body;
      const access = { Authorization: 'Bearer ' + login.token };
      await request(url)
        .get('/api/children/' + admitted.child.id)
        .set(access)
        .expect(200);
      await request(url).get('/api/children/child-a').set(access).expect(403);
      const hashBefore = (
        await prisma.user.findUniqueOrThrow({
          where: { id: admitted.parentId },
        })
      ).password;
      const active = (
        await request(url)
          .post(`/api/crm/leads/${lead.id}/invite-parent`)
          .set(auth('director'))
          .expect(201)
      ).body;
      expect(active.status).toBe('active');
      expect(sentMail).toHaveBeenCalledTimes(1);
      expect(
        (
          await prisma.user.findUniqueOrThrow({
            where: { id: admitted.parentId },
          })
        ).password,
      ).toBe(hashBefore);
      await post({
        ...form,
        tranid: 'site:another-child',
        childName: 'Другой ребенок',
      }).expect(200);
      expect(await prisma.crmLead.count({ where: { email: form.Email } })).toBe(
        2,
      );
      const detail = (
        await request(url)
          .get(`/api/crm/leads/${lead.id}`)
          .set(auth('director'))
          .expect(200)
      ).body;
      expect(detail.relatedLeads).toHaveLength(1);
    } finally {
      keys.forEach((key, i) => {
        if (previous[i] === undefined) delete process.env[key];
        else process.env[key] = previous[i];
      });
      sentMail.mockReset();
    }
  });
});
