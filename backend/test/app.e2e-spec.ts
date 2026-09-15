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
if (!process.env.SECURITY_TEST_DATABASE_URL) throw new Error('Set SECURITY_TEST_DATABASE_URL to an isolated local globoatlas_security database');
describe('Security integration (isolated PostgreSQL)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let url: string;
  let cookies: string[];
  let csrf: string;
  const password = 'Local-security-test-123';
  const sentMail = jest.fn();
  const fileStream = jest.fn(() => Promise.resolve(Readable.from(Buffer.from('test-file'))));
  const sockets: Socket[] = [];
  const token = (id: string, type = 'access') => jwt.sign({ sub: id, type }, { expiresIn: '15m' });
  const auth = (id = 'parent-a') => ({ Authorization: `Bearer ${token(id)}` });
  function setCookies(response: any) {
    const jar = new Map((cookies || []).map(item => [item.split('=')[0], item]));
    for (const item of response.headers['set-cookie'] || []) jar.set(item.split('=')[0], item.split(';')[0]);
    cookies = [...jar.values()];
    csrf = decodeURIComponent(jar.get('XSRF-TOKEN')?.slice('XSRF-TOKEN='.length) || '');
  }
  function connect(options: Record<string, any>) {
    const socket = io(url, { transports: ['websocket'], reconnection: false, ...options });
    sockets.push(socket);
    return socket;
  }
  function event(socket: Socket, name: string) {
    return new Promise<any>(resolve => socket.once(name, resolve));
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'integration-test-only-secret';
    const database = new URL(process.env.SECURITY_TEST_DATABASE_URL!);
    if (!['127.0.0.1', 'localhost'].includes(database.hostname) || database.pathname !== '/globoatlas_security') {
      throw new Error('Security tests only run against a local database named globoatlas_security');
    }
    prisma = new PrismaService({ datasources: { db: { url: process.env.SECURITY_TEST_DATABASE_URL! } } });
    await prisma.$connect();
    // Each run uses a fresh fixture transaction; IDs make repeat runs deterministic.
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    // Table names come only from PostgreSQL's own catalog, never from user input.
    for (const { tablename } of tables) await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename.replace(/"/g, '""')}" CASCADE`);
    const hash = await bcrypt.hash(password, 4);
    for (const [id, role] of [['teacher-a', 'teacher'], ['parent-a', 'parent'], ['parent-b', 'parent'], ['specialist', 'psychologist'], ['admin', 'superadmin']] as const) {
      await prisma.user.create({ data: { id, email: `${id}@example.invalid`, name: id, role, password: hash, consentGivenAt: new Date() } });
    }
    await prisma.group.create({ data: { id: 'group-a', name: 'A', ageRange: '3-6', year: 2026, teacherId: 'teacher-a' } });
    for (const [id, parentId] of [['child-a', 'parent-a'], ['child-b', 'parent-b']]) {
      await prisma.child.create({ data: { id, name: id, birthDate: new Date('2022-01-01'), groupId: id === 'child-a' ? 'group-a' : null, parents: { create: { parentId } } } });
    }
    await prisma.observation.create({ data: { id: 'hidden', childId: 'child-a', userId: 'teacher-a', text: 'hidden', photos: ['/api/files/hidden.jpg'], tags: [], visible: false } });
    await prisma.observation.create({ data: { childId: 'child-a', userId: 'teacher-a', text: 'shared', photos: ['https://old-host.invalid/api/files/shared.jpg'], tags: [], visible: true } });
    await prisma.feedItem.create({ data: { authorId: 'teacher-a', type: 'group_news', scope: 'group', groupId: 'group-a', mediaUrls: ['/api/files/group.jpg'] } });
    await prisma.specialistNote.create({ data: { childId: 'child-a', specialistId: 'specialist', type: 'observation', text: 'private', visibility: 'specialist_only', attachments: ['/api/files/note.pdf'] } });
    await prisma.fileMeta.create({ data: { filename: 'draft.jpg', uploaderId: 'teacher-a', scope: 'uploader' } });
    await prisma.chatRoom.create({ data: { id: 'chat-a', type: 'teacher_parent', participants: { create: [{ userId: 'parent-a' }, { userId: 'teacher-a' }] }, messages: { create: { senderId: 'teacher-a', text: 'hello', attachments: ['/api/files/chat.pdf'] } } } });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue(prisma)
      .overrideProvider(FilesService).useValue({ getFileStream: fileStream })
      .overrideProvider(MailService).useValue({ send: sentMail })
      .compile();
    app = module.createNestApplication<NestExpressApplication>();
    app.useLogger(false);
    app.use(cookieParser());
    app.use(json());
    app.use(urlencoded({ extended: false }));
    app.use(new CsrfMiddleware().use);
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
    jwt = app.get(JwtService);
  }, 30000);
  afterAll(async () => {
    sockets.forEach(socket => socket.disconnect());
    await app?.close();
    await prisma?.$disconnect();
  });

  it('serves health through the real application module', async () => {
    await request(url).get('/api/health').expect(200);
  });
  it.each(['invite', 'reset'])('rejects %s JWTs on both API and files', async purpose => {
    const headers = { Authorization: `Bearer ${token('parent-a', purpose)}` };
    await request(url).get('/api/me').set(headers).expect(401);
    await request(url).get('/api/files/shared.jpg').set(headers).expect(401);
  });
  it('restricts query-token compatibility to media and export', async () => {
    await request(url).get(`/api/me?token=${token('parent-a')}`).expect(401);
    await request(url).get(`/api/files/shared.jpg?token=${token('parent-a')}`).expect(200);
  });
  it('establishes browser cookies without exposing credentials in JSON', async () => {
    const response = await request(url).post('/api/auth/login').send({ email: 'parent-a@example.invalid', password, client: 'web' }).expect(201);
    expect(response.body.user.id).toBe('parent-a');
    expect(response.body.token).toBeUndefined();
    expect(response.body.refreshToken).toBeUndefined();
    for (const name of ['access_token', 'refresh_token']) {
      expect(response.headers['set-cookie'].find((item: string) => item.startsWith(`${name}=`))).toContain('HttpOnly');
    }
    setCookies(response);
    await request(url).get('/api/me').set('Cookie', cookies).expect(200);
    await request(url).get('/api/files/shared.jpg').set('Cookie', cookies).expect(200);
  });
  it('streams a ZIP export using browser cookies', async () => {
    const response = await request(url).get('/api/me/export').set('Cookie', cookies).buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', chunk => chunks.push(Buffer.from(chunk)));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
        res.on('error', callback);
      }).expect(200);
    expect(response.headers['content-type']).toContain('application/zip');
    expect(response.body.subarray(0, 2).toString()).toBe('PK');
  });
  it('protects cookie refresh and rotates it without exposing tokens', async () => {
    await request(url).post('/api/auth/refresh').set('Cookie', cookies).send({}).expect(403);
    const response = await request(url).post('/api/auth/refresh').set('Cookie', cookies).set('X-XSRF-TOKEN', csrf).send({}).expect(201);
    expect(response.body.token).toBeUndefined();
    expect(response.body.refreshToken).toBeUndefined();
    setCookies(response);
  });
  it('rejects CSRF and allows a valid browser profile update', async () => {
    await request(url).put('/api/me').set('Cookie', cookies).send({ name: 'Changed' }).expect(403);
    await request(url).put('/api/me').set('Cookie', cookies).set('X-XSRF-TOKEN', csrf).send({ name: 'Changed' }).expect(200);
    await request(url).put('/api/me').set('Cookie', cookies).set('X-XSRF-TOKEN', csrf).set('Origin', 'https://foreign.invalid').send({ name: 'bad' }).expect(403);
  });
  it('preserves mobile login and refresh without cookie credentials', async () => {
    const login = await request(url).post('/api/auth/login').send({ email: 'parent-b@example.invalid', password, deviceName: 'Mobile App' }).expect(201);
    expect(login.body.token).toBeTruthy();
    expect(login.body.refreshToken).toBeTruthy();
    expect(login.headers['set-cookie'].some((item: string) => item.startsWith('access_token='))).toBe(false);
    const refresh = await request(url).post('/api/auth/refresh').send({ refreshToken: login.body.refreshToken }).expect(201);
    expect(refresh.body.token).toBeTruthy();
  });
  it.each([
    ['shared.jpg', 'parent-a', 200], ['shared_preview.jpg', 'parent-a', 200],
    ['shared.jpg', 'parent-b', 403], ['hidden.jpg', 'parent-a', 403],
    ['group.jpg', 'parent-a', 200], ['group.jpg', 'parent-b', 403],
    ['note.pdf', 'parent-a', 403], ['note.pdf', 'specialist', 200],
    ['chat.pdf', 'parent-a', 200], ['chat.pdf', 'parent-b', 403],
    ['draft.jpg', 'parent-a', 403], ['draft.jpg', 'teacher-a', 200],
    ['unknown.jpg', 'parent-a', 403], ['shared.jpg.exe', 'parent-a', 403],
  ])('enforces resource permissions: %s / %s', async (filename, id, status) => {
    const response = await request(url).get(`/api/files/${filename}`).set(auth(id)).expect(status);
    if (status === 200) expect(response.headers['cache-control']).toBe('private, no-store');
  });
  it('prevents granting access to a private file by setting it as an avatar', async () => {
    await request(url).put('/api/me').set(auth('parent-b')).send({ avatar: '/api/files/shared.jpg' }).expect(403);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: 'parent-b' } })).avatar).toBeNull();
  });
  it('limits login attempts even when X-Forwarded-For is forged', async () => {
    for (let index = 0; index < 5; index++) {
      await request(url).post('/api/auth/login').set('X-Forwarded-For', `203.0.113.${index}`).send({ email: 'rate@example.invalid', password: 'wrong' }).expect(401);
    }
    await request(url).post('/api/auth/login').set('X-Forwarded-For', '203.0.113.99').send({ email: 'rate@example.invalid', password: 'wrong' }).expect(429);
  });
  it('does not exhaust another staff member’s login allowance behind the same router', async () => {
    await request(url).post('/api/auth/login').send({ email: 'another@example.invalid', password: 'wrong' }).expect(401);
  });
  it('disconnects a socket authenticated with an invitation token', async () => {
    const socket = connect({ auth: { token: token('parent-a', 'invite') } });
    await event(socket, 'disconnect');
    expect(socket.connected).toBe(false);
  });
  it('accepts browser socket cookies and revokes access for blocked receivers', async () => {
    const socket = connect({ extraHeaders: { Cookie: cookies.join('; '), Origin: 'http://localhost:3000' } });
    await event(socket, 'connect');
    const joined = event(socket, 'joined');
    socket.emit('joinRoom', 'chat-a');
    await joined;
    const received = jest.fn();
    socket.on('newMessage', received);
    await prisma.user.update({ where: { id: 'parent-a' }, data: { blockedAt: new Date() } });
    const disconnected = event(socket, 'disconnect');
    await app.get(ChatsGateway).notifyNewMessage('chat-a', { text: 'private' });
    await disconnected;
    expect(received).not.toHaveBeenCalled();
    await request(url).get('/api/files/shared.jpg').set(auth()).expect(401);
    await prisma.user.update({ where: { id: 'parent-a' }, data: { blockedAt: null } });
  });
  it('rejects a second use of a password reset link', async () => {
    await request(url).post('/api/auth/forgot').send({ email: 'parent-b@example.invalid' }).expect(201);
    const html = sentMail.mock.calls.at(-1)![0].html as string;
    const resetToken = /reset\?token=([^"<]+)/.exec(html)![1];
    await request(url).post('/api/auth/reset').send({ token: resetToken, password: 'New-test-password-123' }).expect(201);
    await request(url).post('/api/auth/reset').send({ token: resetToken, password: 'Another-test-password-123' }).expect(400);
  });
  it('accepts an invitation once and rejects replay or a blocked invitee', async () => {
    const hash = await bcrypt.hash(password, 4);
    await prisma.user.create({ data: { id: 'invitee', email: 'invitee@example.invalid', name: 'Invitee', role: 'parent', password: hash } });
    const invite = token('invitee', 'invite');
    const body = { token: invite, password, consent: true };
    await request(url).post('/api/auth/invite/accept').send(body).expect(201);
    await request(url).post('/api/auth/invite/accept').send(body).expect(400);
    await prisma.user.create({ data: { id: 'blocked-invitee', email: 'blocked-invitee@example.invalid', name: 'Blocked', role: 'parent', password: hash, blockedAt: new Date() } });
    await request(url).post('/api/auth/invite/accept').send({ ...body, token: token('blocked-invitee', 'invite') }).expect(400);
  });
  it('logs out the browser and clears server cookies', async () => {
    const response = await request(url).post('/api/auth/logout').set('Cookie', cookies).set('X-XSRF-TOKEN', csrf).send({}).expect(201);
    expect(response.headers['set-cookie'].find((item: string) => item.startsWith('access_token='))).toContain('Expires=Thu, 01 Jan 1970');
  });
});
