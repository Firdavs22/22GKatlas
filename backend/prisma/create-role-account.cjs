// Manual VPS account creation. Never called by the application or a seed.
// Input arrives through stdin; passwords are neither arguments nor log output.
const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { isEmail } = require('class-validator');

const roles = new Map([
  ['teacher', 'Педагог'],
  ['parent', 'Родитель'],
  ['psychologist', 'Психолог'],
  ['pediatrician', 'Педиатр'],
  ['methodist', 'Методист'],
  ['sales_manager', 'Менеджер продаж'],
  ['admin', 'Администратор'],
  ['director', 'Директор'],
]);

class AccountError extends Error {}

async function createRoleAccount(prisma, input) {
  const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  const role = input?.role;
  const password = input?.password;
  if (!isEmail(email) || email.length > 254) {
    throw new AccountError('Укажите корректный email.');
  }
  if (!name || name.length > 120) {
    throw new AccountError('Имя: от 1 до 120 символов.');
  }
  if (!roles.has(role)) {
    throw new AccountError('Выберите одну из восьми доступных ролей. Суперадминистратор исключен.');
  }
  if (!Object.values(Role).includes(role)) {
    throw new AccountError('Образ backend еще не поддерживает эту роль. Сначала обновите портал.');
  }
  // Match invite acceptance: minimum 8 characters; bcrypt uses at most 72 bytes.
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new AccountError('Пароль: минимум 8 символов и максимум 72 байта UTF-8.');
  }
  const hash = await bcrypt.hash(password, 12);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`manual-role-account:${email}`}))`;
    const existing = await tx.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      throw new AccountError('Аккаунт с таким email уже существует. Его пароль и роль не изменены.');
    }
    const user = await tx.user.create({
      data: { email, name, role, password: hash },
      select: { id: true, email: true, role: true },
    });
    await tx.auditLog.create({
      data: {
        method: 'CLI',
        path: '/maintenance/create-role-account',
        status: 201,
        body: { userId: user.id, role: user.role },
        summary: 'Аккаунт создан вручную оператором VPS без отправки приглашения.',
      },
    });
    return user;
  });
}

async function main() {
  let raw = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    raw += chunk;
    if (Buffer.byteLength(raw, 'utf8') > 16384) throw new AccountError('Слишком большой ввод.');
  }
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    throw new AccountError('Данные не получены. Используйте bash scripts/create-role-account.sh.');
  }
  const prisma = new PrismaClient();
  try {
    const user = await createRoleAccount(prisma, input);
    console.log(`Создан аккаунт: ${user.email} · ${roles.get(user.role)}.`);
    console.log('Можно войти с заданным паролем. Приглашение по почте не отправлялось.');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    // Prisma errors may include query arguments. Do not log raw errors.
    console.error(error instanceof AccountError ? error.message : error?.code === 'P2002'
      ? 'Аккаунт с таким email уже существует. Данные не изменены.'
      : 'Не удалось создать аккаунт. Проверьте, что база запущена и миграции применены.');
    process.exitCode = 1;
  });
}

module.exports = { createRoleAccount };
