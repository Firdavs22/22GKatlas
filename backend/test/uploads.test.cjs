// Run after npm run build. These tests use the real detector and no external storage.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const sharp = require('sharp');
const XLSX = require('xlsx');
const { FilesController } = require('../dist/src/files/files.controller');

function fixture(buffer, mimetype) {
  return { buffer, mimetype, originalname: 'test-upload', size: buffer.length };
}

function controller() {
  const saved = [];
  const api = new FilesController({
    async uploadFile(file) {
      saved.push(file);
      return { url: '/api/files/test-upload' };
    },
  }, {});
  return { api, saved };
}

test('real PNG and generated XLSX pass content validation', async () => {
  const { api, saved } = controller();
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } }).png().toBuffer();
  await api.uploadFile(fixture(png, 'image/png'), { id: 'test' });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['Сотрудник', 'Часы'], ['Педагог', 8]]), 'Табель');
  const xlsx = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
  await api.uploadFile(fixture(xlsx, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), { id: 'test' });
  assert.equal(saved.length, 2);
  const readback = XLSX.read(xlsx, { type: 'buffer' });
  assert.equal(readback.Sheets['Табель'].B2.v, 8);
});

test('disguised executable and truncated image are rejected before storage', async () => {
  const { api, saved } = controller();
  for (const buffer of [Buffer.from('MZ' + '\0'.repeat(100)), Buffer.from('89504e470d0a1a0a', 'hex')]) {
    await assert.rejects(api.uploadFile(fixture(buffer, 'image/png'), { id: 'test' }), error => error.getStatus() === 400);
  }
  assert.equal(saved.length, 0);
});

test('malformed ASF with a zero-sized object does not hang the upload process', () => {
  const asf = Buffer.alloc(54);
  Buffer.from('3026b2758e66cf11a6d900aa0062ce6c', 'hex').copy(asf);
  asf.writeBigUInt64LE(54n, 16);
  asf.writeUInt32LE(1, 24);
  asf[28] = 1;
  asf[29] = 2;
  Buffer.from('9107dcb7b7a9cf118ee600c00c205365', 'hex').copy(asf, 30);
  // A child-process deadline also catches loops that would block a test timer.
  execFileSync(process.execPath, ['-e', `
    const assert = require('node:assert/strict');
    const { FilesController } = require('./dist/src/files/files.controller');
    const api = new FilesController({ uploadFile() { throw new Error('Unexpected storage write'); } }, {});
    assert.rejects(api.uploadFile({ buffer: Buffer.from(process.argv[1], 'base64'),
      mimetype: 'video/mp4', originalname: 'broken.asf' }, { id: 'test' }),
      error => error.getStatus() === 400).catch(error => { console.error(error); process.exitCode = 1; });
  `, asf.toString('base64')], { cwd: path.resolve(__dirname, '..'), timeout: 5000, stdio: 'pipe' });
});
