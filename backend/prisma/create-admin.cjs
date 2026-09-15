const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { isEmail } = require('class-validator');

class SetupError extends Error {}

// An explicit one-time command, never called by the server entrypoint.
// Credentials arrive on stdin so they do not appear in command arguments or logs.
async function createFirstAdmin(prisma, input) {
  const email =
    typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = input?.password;
  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  if (!isEmail(email) || email.length > 254) {
    throw new SetupError('Укажите корректный email администратора.');
  }
  if (
    typeof password !== 'string' ||
    password.length < 12 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    throw new SetupError(
      'Пароль: минимум 12 символов и максимум 72 байта UTF-8.',
    );
  }
  if (!name || name.length > 120) {
    throw new SetupError('Имя администратора: от 1 до 120 символов.');
  }
  const hash = await bcrypt.hash(password, 12);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('bootstrap:first-admin'))`;
    if (await tx.user.count()) {
      throw new SetupError(
        'В базе уже есть пользователи. Создание первого администратора отменено; данные не изменены.',
      );
    }
    return tx.user.create({
      data: { email, password: hash, name, role: 'superadmin' },
      select: { id: true, email: true, role: true },
    });
  });
}

async function main() {
  if (process.stdin.isTTY) {
    throw new SetupError(
      'Передайте JSON с email, name и password через stdin согласно DEPLOYMENT.md.',
    );
  }
  let raw = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    raw += chunk.toString();
    if (raw.length > 16384) throw new SetupError('Слишком большой ввод.');
  }
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    throw new SetupError('Ожидается JSON с email, name и password.');
  }
  const prisma = new PrismaClient();
  try {
    await createFirstAdmin(prisma, input);
    console.log(
      'Первый главный администратор создан. Теперь можно войти в портал.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    // Prisma error messages can contain query arguments; never print them here.
    console.error(
      error instanceof SetupError
        ? error.message
        : 'Не удалось создать администратора. Проверьте подключение к БД и применение миграций.',
    );
    process.exitCode = 1;
  });
}

module.exports = { createFirstAdmin, SetupError };
