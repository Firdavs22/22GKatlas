import { ForbiddenException } from '@nestjs/common';
import { FileAccessService, referencedFiles } from './file-access.service';

describe('File access', () => {
  const user = { id: 'parent-1', role: 'parent' };
  let prisma: any;
  let access: any;
  let service: FileAccessService;
  beforeEach(() => {
    prisma = {
      fileMeta: { findUnique: jest.fn().mockResolvedValue({ uploaderId: 'teacher-1', scope: 'uploader' }) },
      $queryRaw: jest.fn().mockResolvedValue([]),
      chatParticipant: { findUnique: jest.fn().mockResolvedValue(null) },
      child: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    access = { checkChildAccess: jest.fn(async id => { if (id !== 'own-child') throw new ForbiddenException(); }) };
    service = new FileAccessService(prisma, access);
  });
  it('does not grant access just because the uploader is staff', async () => {
    await expect(service.assertCanRead('private.jpg', user)).rejects.toThrow(ForbiddenException);
  });
  it('denies unknown legacy files', async () => {
    prisma.fileMeta.findUnique.mockResolvedValue(null);
    await expect(service.assertCanRead('legacy.pdf', user)).rejects.toThrow(ForbiddenException);
  });
  it('allows the uploader to preview a draft', async () => {
    prisma.fileMeta.findUnique.mockResolvedValue({ uploaderId: user.id });
    await expect(service.assertCanRead('draft.jpg', user)).resolves.toBeUndefined();
  });
  it.each([
    ['own-child', true, true], ['other-child', true, false], ['own-child', false, false],
  ])('checks the child and observation visibility: %s / %s', async (childId, visible, allowed) => {
    prisma.$queryRaw.mockResolvedValue([{ kind: 'observation', data: { childId, visible } }]);
    const result = service.assertCanRead('photo.jpg', user);
    if (allowed) await expect(result).resolves.toBeUndefined();
    else await expect(result).rejects.toThrow(ForbiddenException);
  });
  it('requires membership for a chat attachment', async () => {
    prisma.$queryRaw.mockResolvedValue([{ kind: 'chat', data: { chatId: 'private-chat' } }]);
    await expect(service.assertCanRead('file.pdf', user)).rejects.toThrow(ForbiddenException);
    prisma.chatParticipant.findUnique.mockResolvedValue({ userId: user.id });
    await expect(service.assertCanRead('file.pdf', user)).resolves.toBeUndefined();
  });
  it('does not reveal a specialist-only attachment to a parent', async () => {
    prisma.$queryRaw.mockResolvedValue([{ kind: 'note', data: { childId: 'own-child', visibility: 'specialist_only' } }]);
    await expect(service.assertCanRead('note.pdf', user)).rejects.toThrow(ForbiddenException);
  });
  it('blocks an attempt to attach a foreign private file', async () => {
    await expect(service.assertCanAttach({ avatar: 'https://old-host/api/files/private.jpg' }, user)).rejects.toThrow(ForbiddenException);
  });
  it('finds nested references, rich text, and query strings without matching filename prefixes', () => {
    expect(referencedFiles({ nested: ['<img src="/api/files/a.jpg">', '/api/files/a.jpg?token=old', '/files/b.pdf', '/api/files/a.jpg.exe'] }))
      .toEqual(['a.jpg', 'b.pdf']);
  });
  it.each(['parent', 'teacher', 'psychologist', 'pediatrician', 'methodist'])('enforces family documents for %s, even for uploader/public/chat copies', async role => {
    prisma.fileMeta.findUnique.mockResolvedValue({ uploaderId: user.id, scope: 'public' });
    prisma.chatParticipant.findUnique.mockResolvedValue({ userId: user.id });
    prisma.$queryRaw.mockResolvedValue([
      { kind: 'child-document', data: { childId: 'other-child', deleted: false } },
      { kind: 'chat', data: { chatId: 'my-chat' } }, { kind: 'site', data: {} },
    ]);
    await expect(service.assertCanRead('document.pdf', { ...user, role })).rejects.toThrow(ForbiddenException);
  });
  it('allows the linked parent but not a teacher with normal child access', async () => {
    prisma.$queryRaw.mockResolvedValue([{ kind: 'child-document', data: { childId: 'own-child', deleted: false } }]);
    await expect(service.assertCanRead('scan.png', user)).resolves.toBeUndefined();
    await expect(service.assertCanRead('scan.png', { ...user, role: 'teacher' })).rejects.toThrow(ForbiddenException);
  });
  it('denies a removed document to its parent uploader', async () => {
    prisma.fileMeta.findUnique.mockResolvedValue({ uploaderId: user.id, scope: 'child-document' });
    prisma.$queryRaw.mockResolvedValue([{ kind: 'child-document', data: { childId: 'own-child', deleted: true } }]);
    await expect(service.assertCanRead('removed.pdf', user)).rejects.toThrow(ForbiddenException);
  });
  it('denies orphaned document uploads after creation failure or child deletion', async () => {
    prisma.fileMeta.findUnique.mockResolvedValue({ uploaderId: user.id, scope: 'child-document' });
    await expect(service.assertCanRead('orphan.pdf', user)).rejects.toThrow(ForbiddenException);
  });
  it.each(['admin', 'director', 'superadmin'])('allows administration role %s', async role => {
    await expect(service.assertCanRead('document.pdf', { id: 'staff', role })).resolves.toBeUndefined();
  });
});
