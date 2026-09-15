const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { createFirstAdmin, SetupError } = require('../prisma/create-admin.cjs');

const databaseUrl = process.env.SECURITY_TEST_DATABASE_URL;
if (!databaseUrl)
  throw new Error(
    'Set SECURITY_TEST_DATABASE_URL to an isolated local globoatlas_security database.',
  );
const url = new URL(databaseUrl);
if (
  !['localhost', '127.0.0.1'].includes(url.hostname) ||
  url.pathname !== '/globoatlas_security'
) {
  throw new Error(
    'Bootstrap tests only run against a local database named globoatlas_security.',
  );
}
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const input = {
  email: ' Owner@Example.invalid ',
  name: 'Владелец',
  password: 'Bootstrap-test-only-123',
};

before(async () => {
  await prisma.$connect();
  const tables =
    await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  for (const { tablename } of tables) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "${tablename.replace(/"/g, '""')}" CASCADE`,
    );
  }
});
after(() => prisma.$disconnect());

test('invalid initial credentials cannot create any users', async () => {
  for (const patch of [
    { email: 'not-an-email' },
    { name: '' },
    { password: 'admin123' },
    { password: 'я'.repeat(37) },
  ]) {
    await assert.rejects(
      createFirstAdmin(prisma, { ...input, ...patch }),
      SetupError,
    );
  }
  assert.equal(await prisma.user.count(), 0);
});

test('concurrent initialization creates exactly one administrator, no demo accounts', async () => {
  const results = await Promise.allSettled([
    createFirstAdmin(prisma, input),
    createFirstAdmin(prisma, { ...input, email: 'second@example.invalid' }),
  ]);
  assert.equal(
    results.filter((result) => result.status === 'fulfilled').length,
    1,
  );
  const rejected = results.find((result) => result.status === 'rejected');
  assert.ok(rejected.reason instanceof SetupError);
  const users = await prisma.user.findMany();
  assert.equal(users.length, 1);
  assert.equal(users[0].role, 'superadmin');
  assert.ok(
    ['owner@example.invalid', 'second@example.invalid'].includes(
      users[0].email,
    ),
  );
  assert.equal(users[0].name, 'Владелец');
  assert.notEqual(users[0].password, input.password);
  assert.ok(await bcrypt.compare(input.password, users[0].password));
  assert.equal(users[0].consentGivenAt, null);
  assert.equal(await prisma.child.count(), 0);
});

test('repeating initialization preserves the existing account and password', async () => {
  const beforeUsers = await prisma.user.findMany();
  await assert.rejects(
    createFirstAdmin(prisma, { ...input, password: 'Different-test-only-123' }),
    SetupError,
  );
  assert.deepEqual(await prisma.user.findMany(), beforeUsers);
});
