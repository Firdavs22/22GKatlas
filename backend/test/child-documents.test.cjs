// Uses compiled services and the real MIME detector. No database or storage is started.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { validate } = require('class-validator');
const { ChildDocumentsService, UploadChildDocumentDto } = require('../dist/src/child-documents/child-documents.module');
const { AdminService } = require('../dist/src/admin/admin.service');
const { ChildSafetyDto } = require('../dist/src/admin/dto/child-safety.dto');

const parent = { id: 'parent', role: 'parent' };
function setup() {
  const documents = [];
  const uploads = [];
  const prisma = {
    childParent: { findUnique: async ({ where }) => where.childId_parentId.childId === 'own' && where.childId_parentId.parentId === parent.id ? { childId: 'own' } : null },
    child: { findUnique: async ({ where }) => ({ id: where.id }) },
    childDocument: {
      findMany: async ({ where }) => documents.filter(d => d.childId === where.childId && !d.deletedAt),
      findFirst: async ({ where }) => documents.find(d => d.id === where.id && d.childId === where.childId),
      create: async ({ data }) => { const doc = { ...data, id: 'doc-' + documents.length, uploadedAt: new Date(), deletedAt: null }; documents.push(doc); return doc; },
      updateMany: async ({ where, data }) => { Object.assign(documents.find(d => d.id === where.id), data); return { count: 1 }; },
    },
  };
  const files = { uploadFile: async (...args) => { uploads.push(args); return { url: '/api/files/scan.png' }; } };
  return { service: new ChildDocumentsService(prisma, files), documents, uploads, prisma };
}
const denied = error => error.getStatus() === 403;

test('folder access is limited to administration and linked parents', async () => {
  const { service } = setup();
  assert.deepEqual(await service.list('own', parent), []);
  for (const role of ['admin', 'director', 'superadmin']) assert.deepEqual(await service.list('other', { id: 'staff', role }), []);
  for (const role of ['teacher', 'methodist', 'psychologist', 'pediatrician']) await assert.rejects(service.list('own', { ...parent, role }), denied);
  await assert.rejects(service.list('other', parent), denied);
});

test('unauthorized upload is rejected before writing storage', async () => {
  const { service, uploads } = setup();
  await assert.rejects(service.upload('other', parent, {}, {}), denied);
  assert.equal(uploads.length, 0);
});

test('real scan is attached to the authorized child, and removed files disappear', async () => {
  const { service, uploads } = setup();
  const buffer = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } }).png().toBuffer();
  const file = { buffer, size: buffer.length, mimetype: 'image/png', originalname: 'scan.png' };
  const doc = await service.upload('own', parent, file, { category: 'consent', title: 'Согласие' });
  assert.equal(uploads[0][2], 'own');
  assert.equal(doc.canRemove, true);
  assert.equal(doc.title, 'Согласие');
  assert.equal((await service.list('own', parent)).length, 1);
  await assert.rejects(service.remove('other', doc.id, parent), denied);
  await service.remove('own', doc.id, parent);
  assert.equal((await service.list('own', parent)).length, 0);
});

test('parent cannot remove documents uploaded by administration or another parent', async () => {
  const { service, documents } = setup();
  documents.push({ id: 'staff-doc', childId: 'own', uploaderId: 'admin', deletedAt: null });
  assert.equal((await service.list('own', parent))[0].canRemove, false);
  await assert.rejects(service.remove('own', 'staff-doc', parent), denied);
  await service.remove('own', 'staff-doc', { id: 'director', role: 'director' });
  assert.equal((await service.list('own', parent)).length, 0);
});

test('Cyrillic filenames survive both browser multipart and already decoded uploads', async () => {
  const { service } = setup();
  const buffer = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } }).png().toBuffer();
  const name = 'Согласие.png';
  for (const originalname of [name, Buffer.from(name, 'utf8').toString('latin1')]) {
    const doc = await service.upload('own', parent, { buffer, size: buffer.length, mimetype: 'image/png', originalname }, {});
    assert.equal(doc.originalName, name);
    assert.equal(doc.title, name);
  }
});

test('document upload rejects executable content, SVG, mismatched types and oversized files', async () => {
  const { service, uploads } = setup();
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } }).png().toBuffer();
  for (const file of [
    { buffer: Buffer.from('MZ' + '\0'.repeat(100)), mimetype: 'image/png', size: 102 },
    { buffer: Buffer.from('<svg/>'), mimetype: 'image/svg+xml', size: 6 },
    { buffer: png, mimetype: 'application/pdf', size: png.length },
    { buffer: png, mimetype: 'image/png', size: 21 * 1024 * 1024 },
  ]) await assert.rejects(service.upload('own', parent, { originalname: 'scan', ...file }, {}), error => error.getStatus() === 400);
  assert.equal(uploads.length, 0);
});

test('safety input requires an explicit status, revision and valid contact email', async () => {
  const valid = { safetyRevision: 0, forbiddenFoods: '', contactEmail: '', socialPublicationStatus: 'unknown', socialPublicationComment: '' };
  assert.equal((await validate(Object.assign(new ChildSafetyDto(), valid))).length, 0);
  for (const change of [{ safetyRevision: -1 }, { socialPublicationStatus: true }, { contactEmail: 'not-email' }, { forbiddenFoods: null }, { socialPublicationComment: 'a'.repeat(4001) }]) {
    assert.ok((await validate(Object.assign(new ChildSafetyDto(), valid, change))).length);
  }
  assert.ok((await validate(Object.assign(new UploadChildDocumentDto(), { category: 'arbitrary', title: 'x'.repeat(201) }))).length);
});

test('concurrent staff edits cannot overwrite the newer publication restriction', async () => {
  const child = { id: 'own', safetyRevision: 0, socialPublicationStatus: 'unknown' };
  const tx = { child: {
    updateMany: async ({ where, data }) => {
      if (where.safetyRevision !== child.safetyRevision) return { count: 0 };
      const revision = child.safetyRevision + 1;
      Object.assign(child, data, { safetyRevision: revision }); return { count: 1 };
    }, findUniqueOrThrow: async () => ({ ...child }),
  } };
  const admin = new AdminService({}, { $transaction: async fn => fn(tx) }, {}, {});
  const dto = { safetyRevision: 0, forbiddenFoods: 'Орехи', contactEmail: '', socialPublicationStatus: 'forbidden', socialPublicationComment: 'Запрет родителей' };
  const saved = await admin.updateChildSafety('own', dto);
  assert.equal(saved.safetyRevision, 1);
  await assert.rejects(admin.updateChildSafety('own', { ...dto, socialPublicationStatus: 'allowed' }), error => error.getStatus() === 409);
  assert.equal(child.socialPublicationStatus, 'forbidden');
});
