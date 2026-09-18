// Add one fictional child to the existing database. This is NOT prisma/seed.
// No users, invitations, notifications, payments or changes to existing children.
const { PrismaClient } = require('@prisma/client');

const CHILD_ID = '7fba6ad6-7892-4d18-9fe0-665798113662';
const GROUP_ID = '5a2b1582-c92a-46b5-a265-f193fe3d7b37';
const MARKER = 'globoatlas:demo-child-history:v1';
const DAY = 86400000;
class DemoError extends Error {}

function schoolDate(now) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.TEAM_TIMEZONE || 'Europe/Moscow',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (name) => Number(parts.find((p) => p.type === name).value);
  // Attendance endpoints use a date-only string parsed as UTC midnight.
  return new Date(Date.UTC(part('year'), part('month') - 1, part('day')));
}

async function selectSkills(tx) {
  let skills = await tx.skill.findMany({
    select: {
      id: true, developsEmotion: true, developsCognition: true, developsBody: true,
      group: { select: { areaId: true } },
    },
    orderBy: [
      { group: { area: { sortOrder: 'asc' } } },
      { group: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { id: 'asc' },
    ],
  });
  const createdCatalog = skills.length === 0;
  if (createdCatalog) {
    const examples = [
      ['Эмоции и общение', '#8B5CF6', 'developsEmotion', ['Называет свои эмоции', 'Просит помощь словами', 'Договаривается об очередности', 'Участвует в совместной игре']],
      ['Познание', '#0F5192', 'developsCognition', ['Сортирует предметы по цвету', 'Сопоставляет предметы по размеру', 'Считает предметы до пяти', 'Собирает последовательность']],
      ['Движение и самостоятельность', '#16A34A', 'developsBody', ['Переносит поднос', 'Переливает воду', 'Застегивает пуговицы', 'Ходит по линии']],
    ];
    skills = [];
    for (const [index, [title, color, dimension, titles]] of examples.entries()) {
      const area = await tx.area.create({
        data: { title: `[Демо] ${title}`, icon: 'circle', color, sortOrder: 990 + index },
      });
      const group = await tx.skillGroup.create({
        data: { title: 'Примеры навыков для проверки', areaId: area.id, sortOrder: 0 },
      });
      for (const [sortOrder, skillTitle] of titles.entries()) {
        const skill = await tx.skill.create({
          data: {
            title: skillTitle, description: 'Демонстрационный навык, создан для проверки портала.',
            ageRange: '3-6', groupId: group.id, sortOrder, [dimension]: true,
          },
        });
        skills.push({ ...skill, group: { areaId: area.id } });
      }
    }
  }

  // Cover existing development dimensions and then sample different areas.
  // Never change the real catalog's flags or create copies of existing skills.
  const selected = new Map();
  for (const flag of ['developsEmotion', 'developsCognition', 'developsBody']) {
    const skill = skills.find((s) => s[flag] && !selected.has(s.id));
    if (skill) selected.set(skill.id, skill);
  }
  const buckets = new Map();
  for (const skill of skills) {
    const key = skill.group.areaId;
    if (!buckets.has(key)) buckets.set(key, []);
    if (!selected.has(skill.id)) buckets.get(key).push(skill);
  }
  for (let index = 0; selected.size < 12; index++) {
    let added = false;
    for (const bucket of buckets.values()) {
      if (bucket[index] && selected.size < 12) {
        selected.set(bucket[index].id, bucket[index]);
        added = true;
      }
    }
    if (!added) break;
  }
  return { skills: [...selected.values()], createdCatalog };
}

async function createDemoChild(prisma, now = new Date()) {
  const today = schoolDate(now);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${MARKER}))`;
    const existing = await tx.child.findFirst({
      where: { OR: [{ id: CHILD_ID }, { externalId: MARKER }] },
      select: { id: true, externalId: true },
    });
    if (existing) {
      if (existing.id !== CHILD_ID || existing.externalId !== MARKER) {
        throw new DemoError('Идентификатор демокарточки занят другой записью. Данные не изменены.');
      }
      return { created: false, childId: existing.id };
    }
    const existingGroup = await tx.group.findUnique({ where: { id: GROUP_ID } });
    if (existingGroup && existingGroup.externalId !== MARKER) {
      throw new DemoError('Идентификатор демогруппы занят другой записью. Данные не изменены.');
    }
    if (!existingGroup) {
      await tx.group.create({
        data: {
          id: GROUP_ID, name: 'Демо-группа 3–6 лет', ageRange: '3-6',
          year: today.getUTCFullYear(), monthlyFee: 0, externalId: MARKER,
        },
      });
    }
    const attendance = [];
    for (let ago = 60; ago >= 1; ago--) {
      const date = new Date(today.getTime() - ago * DAY);
      if ([0, 6].includes(date.getUTCDay())) continue;
      const index = attendance.length;
      const status = [9, 10].includes(index) ? 'sick'
        : index === 18 ? 'vacation' : index === 29 ? 'absent' : 'present';
      attendance.push({ childId: CHILD_ID, date, status });
    }
    await tx.child.create({
      data: {
        id: CHILD_ID, externalId: MARKER, name: 'Демо — Саша Примеров',
        birthDate: new Date(Date.UTC(today.getUTCFullYear() - 4, today.getUTCMonth() - 6, 15)),
        enrolledAt: attendance[0].date, groupId: GROUP_ID, monthlyFee: 0,
        notes: 'ДЕМО. Вымышленный ребенок. Посещаемость и история навыков созданы автоматически для проверки интерфейса. Родитель пока не привязан.',
      },
    });
    await tx.attendance.createMany({ data: attendance });
    const { skills, createdCatalog } = await selectSkills(tx);
    const presentDays = attendance.filter((a) => a.status === 'present');
    let historyCount = 0;
    for (const [index, skill] of skills.entries()) {
      // Three initial mastered skills populate available dimension summaries.
      const stage = index < 3 ? 'mastered' : ['practicing', 'presented', 'mastered'][index % 3];
      const stages = ['none', 'presented', 'practicing', 'mastered'];
      const dayIndexes = [
        2 + index % 10,
        Math.floor(presentDays.length / 2) + index % 4,
        presentDays.length - 1 - index % 5,
      ];
      const changes = [];
      for (let step = 1; step <= stages.indexOf(stage); step++) {
        changes.push({
          oldStage: stages[step - 1], newStage: stages[step],
          changedAt: new Date(presentDays[dayIndexes[step - 1]].date.getTime() + 9 * 3600000),
          note: 'Демонстрационная запись истории, созданная скриптом. Не реальное наблюдение педагога.',
        });
      }
      await tx.progress.create({
        data: {
          childId: CHILD_ID, skillId: skill.id, stage,
          updatedAt: changes[changes.length - 1].changedAt,
          history: { create: changes },
        },
      });
      historyCount += changes.length;
    }
    await tx.auditLog.create({
      data: {
        method: 'CLI', path: '/maintenance/create-demo-child', status: 201,
        body: { childId: CHILD_ID, attendance: attendance.length, skills: skills.length, history: historyCount, createdCatalog },
        summary: 'Оператор VPS создал вымышленную карточку ребенка с демонстрационной историей.',
      },
    });
    return {
      created: true, childId: CHILD_ID, attendance: attendance.length, skills: skills.length,
      history: historyCount, createdCatalog,
      from: attendance[0].date.toISOString().slice(0, 10),
      to: attendance[attendance.length - 1].date.toISOString().slice(0, 10),
    };
  }, { timeout: 30000 });
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await createDemoChild(prisma);
    if (!result.created) {
      console.log(`Демокарточка уже существует (${result.childId}). Повторные записи не созданы, изменения сохранены.`);
      return;
    }
    console.log('Создан ребенок: Демо — Саша Примеров. Группа: Демо-группа 3–6 лет.');
    console.log(`Посещаемость: ${result.attendance} будних дней, ${result.from} — ${result.to}.`);
    console.log(`Навыков: ${result.skills}. Записей истории: ${result.history}.`);
    if (result.createdCatalog) console.log('Справочник был пуст: добавлены 12 демонстрационных навыков в трех зонах [Демо].');
    console.log('Родитель не привязан. В разделе «Дети» откройте «Редактировать» у демокарточки и укажите имя и email существующего родителя в блоке «Родители».');
    console.log('Для проверки педагогом назначьте его в разделе «Группы» на демогруппу.');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof DemoError ? error.message
      : 'Не удалось создать демокарточку. Изменения транзакции отменены. Проверьте подключение к базе, миграции и TEAM_TIMEZONE.');
    process.exitCode = 1;
  });
}

module.exports = { createDemoChild };
