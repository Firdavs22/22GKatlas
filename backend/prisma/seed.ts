import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ─── CLEAN UP ─────────────────────────────────────────────
  await prisma.progressHistory.deleteMany();
  await prisma.progress.deleteMany();
  await prisma.homeTask.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatParticipant.deleteMany();
  await prisma.chatRoom.deleteMany();
  await prisma.feedItem.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.observation.deleteMany();
  await prisma.portfolioItem.deleteMany();
  await prisma.specialistNote.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.childParent.deleteMany();
  await prisma.childSpecialist.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.skillGroup.deleteMany();
  await prisma.area.deleteMany();
  await prisma.child.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();

  // ─── USERS ────────────────────────────────────────────────
  console.log('Creating users...');
  const passwordHash = async (plain: string) => bcrypt.hash(plain, 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      password: await passwordHash('admin123'),
      name: 'Администратор',
      role: 'admin',
    },
  });

  const teacher = await prisma.user.create({
    data: {
      email: 'teacher@test.com',
      password: await passwordHash('teacher123'),
      name: 'Анна Петрова',
      role: 'teacher',
    },
  });

  const parent = await prisma.user.create({
    data: {
      email: 'parent@test.com',
      password: await passwordHash('parent123'),
      name: 'Мария Иванова',
      role: 'parent',
    },
  });

  const psychologist = await prisma.user.create({
    data: {
      email: 'psychologist@test.com',
      password: await passwordHash('psych123'),
      name: 'Психолог Светлана',
      role: 'psychologist',
    },
  });

  const pediatrician = await prisma.user.create({
    data: {
      email: 'pediatrician@test.com',
      password: await passwordHash('peds123'),
      name: 'Педиатр Дмитрий',
      role: 'pediatrician',
    },
  });

  // ─── GROUP ────────────────────────────────────────────────
  console.log('Creating group...');
  const group = await prisma.group.create({
    data: {
      name: 'Солнышко',
      ageRange: '3-6',
      year: 2024,
      teacherId: teacher.id,
    },
  });

  // ─── CHILDREN ─────────────────────────────────────────────
  console.log('Creating children...');
  const child1 = await prisma.child.create({
    data: {
      name: 'Иван Иванов',
      birthDate: new Date('2020-03-15'),
      groupId: group.id,
      status: 'active',
    },
  });

  const child2 = await prisma.child.create({
    data: {
      name: 'Соня Сидорова',
      birthDate: new Date('2019-07-22'),
      groupId: group.id,
      status: 'active',
    },
  });

  const child3 = await prisma.child.create({
    data: {
      name: 'Артём Козлов',
      birthDate: new Date('2020-11-08'),
      groupId: group.id,
      status: 'active',
    },
  });

  // ─── ASSIGNMENTS ──────────────────────────────────────────
  console.log('Creating assignments...');

  // Parent → child1
  await prisma.childParent.create({
    data: { childId: child1.id, parentId: parent.id },
  });

  // Psychologist → all children
  for (const child of [child1, child2, child3]) {
    await prisma.childSpecialist.create({
      data: { childId: child.id, specialistId: psychologist.id, role: 'psychologist' },
    });
  }

  // Pediatrician → all children
  for (const child of [child1, child2, child3]) {
    await prisma.childSpecialist.create({
      data: { childId: child.id, specialistId: pediatrician.id, role: 'pediatrician' },
    });
  }

  // ─── SKILLS FROM XLSX ─────────────────────────────────────
  console.log('Seeding skills from xlsx...');
  const xlsxPath = path.join(__dirname, 'data', 'skills.xlsx');

  if (fs.existsSync(xlsxPath)) {
    await seedSkillsFromXlsx(xlsxPath);
  } else {
    console.warn('⚠️  skills.xlsx not found, seeding fallback skills...');
    await seedFallbackSkills();
  }

  // ─── PROGRESS (sample) ────────────────────────────────────
  console.log('Creating sample progress...');
  const allSkills = await prisma.skill.findMany({ take: 10 });
  for (const skill of allSkills.slice(0, 5)) {
    await prisma.progress.upsert({
      where: { childId_skillId: { childId: child1.id, skillId: skill.id } },
      update: {},
      create: {
        childId: child1.id,
        skillId: skill.id,
        stage: 'mastered',
        updatedById: teacher.id,
      },
    });
  }
  for (const skill of allSkills.slice(5, 8)) {
    await prisma.progress.upsert({
      where: { childId_skillId: { childId: child1.id, skillId: skill.id } },
      update: {},
      create: {
        childId: child1.id,
        skillId: skill.id,
        stage: 'practicing',
        updatedById: teacher.id,
      },
    });
  }

  // ─── FEED ─────────────────────────────────────────────────
  console.log('Creating feed items...');
  await prisma.feedItem.create({
    data: {
      type: 'group_news',
      scope: 'group',
      authorId: teacher.id,
      groupId: group.id,
      title: 'Добро пожаловать!',
      text: 'Начинается новый учебный год. Ждём всех детей!',
      pinned: true,
    },
  });

  await prisma.feedItem.create({
    data: {
      type: 'child_photo',
      scope: 'child',
      authorId: teacher.id,
      childId: child1.id,
      groupId: group.id,
      text: 'Иван занимается с материалом "Красные штанги"',
      mediaUrls: [],
    },
  });

  await prisma.feedItem.create({
    data: {
      type: 'school_news',
      scope: 'school',
      authorId: admin.id,
      title: 'Открытый день',
      text: 'Приглашаем родителей на открытый день 20 марта в 10:00',
    },
  });

  // ─── SCHEDULE ─────────────────────────────────────────────
  console.log('Creating schedule...');
  const schedule = [
    { day: 1, start: '08:00', end: '08:30', activity: 'Приём детей', desc: null },
    { day: 1, start: '08:30', end: '09:00', activity: 'Завтрак', desc: null },
    { day: 1, start: '09:00', end: '11:30', activity: 'Свободная работа', desc: 'Свободная работа с материалом' },
    { day: 1, start: '11:30', end: '12:00', activity: 'Прогулка', desc: null },
    { day: 1, start: '12:00', end: '13:00', activity: 'Обед', desc: null },
    { day: 2, start: '08:00', end: '08:30', activity: 'Приём детей', desc: null },
    { day: 2, start: '09:00', end: '11:30', activity: 'Свободная работа', desc: null },
    { day: 3, start: '08:00', end: '08:30', activity: 'Приём детей', desc: null },
    { day: 3, start: '09:00', end: '11:30', activity: 'Свободная работа', desc: null },
    { day: 4, start: '08:00', end: '08:30', activity: 'Приём детей', desc: null },
    { day: 4, start: '09:00', end: '11:30', activity: 'Свободная работа', desc: null },
    { day: 5, start: '08:00', end: '08:30', activity: 'Приём детей', desc: null },
    { day: 5, start: '09:00', end: '11:30', activity: 'Свободная работа', desc: null },
  ];

  for (const s of schedule) {
    await prisma.schedule.create({
      data: {
        groupId: group.id,
        dayOfWeek: s.day,
        timeStart: s.start,
        timeEnd: s.end,
        activity: s.activity,
        description: s.desc,
      },
    });
  }

  // ─── OBSERVATION ──────────────────────────────────────────
  console.log('Creating observation...');
  await prisma.observation.create({
    data: {
      childId: child1.id,
      userId: teacher.id,
      text: 'Иван сегодня самостоятельно выбрал материал "Цилиндры-вкладыши" и работал с ним 20 минут.',
      visible: true,
      tags: ['концентрация', 'сенсорика'],
      photos: [],
    },
  });

  // ─── PAYMENTS ─────────────────────────────────────────────
  console.log('Creating payments...');
  for (const child of [child1, child2, child3]) {
    await prisma.payment.create({
      data: {
        childId: child.id,
        month: new Date('2025-03-01'),
        amount: 30000,
        paid: 30000,
        status: 'paid',
      },
    });
    await prisma.payment.create({
      data: {
        childId: child.id,
        month: new Date('2025-04-01'),
        amount: 30000,
        paid: 0,
        status: 'pending',
      },
    });
  }

  // ─── ATTENDANCE ───────────────────────────────────────────
  console.log('Creating attendance...');
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip weekends

    for (const child of [child1, child2, child3]) {
      await prisma.attendance.upsert({
        where: { childId_date: { childId: child.id, date } },
        update: {},
        create: {
          childId: child.id,
          date,
          status: i === 2 ? 'sick' : 'present',
        },
      });
    }
  }

  // ─── HOME TASKS ───────────────────────────────────────────
  const firstSkill = await prisma.skill.findFirst();
  if (firstSkill) {
    await prisma.homeTask.create({
      data: {
        childId: child1.id,
        skillId: firstSkill.id,
        title: 'Попрактикуйте дома пересыпание',
        description: 'Возьмите две кружки и пересыпайте крупу ложкой.',
        status: 'pending',
      },
    });
  }

  console.log('✅ Seed completed!');
  console.log('\nTest accounts:');
  console.log('  admin@test.com / admin123');
  console.log('  teacher@test.com / teacher123');
  console.log('  parent@test.com / parent123');
  console.log('  psychologist@test.com / psych123');
  console.log('  pediatrician@test.com / peds123');
}

async function seedSkillsFromXlsx(xlsxPath: string) {
  const workbook = XLSX.readFile(xlsxPath);

  // Read areas — columns: id, title, icon, color, sort_order
  const areasSheet = workbook.Sheets['Для импорта (areas)'];
  if (areasSheet) {
    const areasData: any[] = XLSX.utils.sheet_to_json(areasSheet);
    for (const row of areasData) {
      await prisma.area.upsert({
        where: { id: `area-${row.id}` },
        update: {},
        create: {
          id: `area-${row.id}`,
          title: String(row.title || ''),
          icon: String(row.icon || '📚'),
          color: String(row.color || '#4B5563'),
          sortOrder: Number(row.sort_order || 0),
        },
      });
    }
    console.log(`  ✓ Seeded ${areasData.length} areas`);
  }

  // Read skill groups — columns: id, title, area_id, sort_order
  const groupsSheet = workbook.Sheets['Для импорта (skill_groups)'];
  if (groupsSheet) {
    const groupsData: any[] = XLSX.utils.sheet_to_json(groupsSheet);
    for (const row of groupsData) {
      await prisma.skillGroup.upsert({
        where: { id: `sg-${row.id}` },
        update: {},
        create: {
          id: `sg-${row.id}`,
          title: String(row.title || ''),
          areaId: `area-${row.area_id}`,
          sortOrder: Number(row.sort_order || 0),
        },
      });
    }
    console.log(`  ✓ Seeded ${groupsData.length} skill groups`);
  }

  // Read skills — columns: id, title, skill_group_id, description, developmental_skills, age_range, sort_order
  const skillsSheet = workbook.Sheets['Для импорта (skills)'];
  if (skillsSheet) {
    const skillsData: any[] = XLSX.utils.sheet_to_json(skillsSheet);
    for (const row of skillsData) {
      await prisma.skill.upsert({
        where: { id: `sk-${row.id}` },
        update: {},
        create: {
          id: `sk-${row.id}`,
          title: String(row.title || ''),
          description: row.description || row.developmental_skills || null,
          ageRange: row.age_range ? String(row.age_range) : null,
          sortOrder: Number(row.sort_order || 0),
          groupId: `sg-${row.skill_group_id}`,
        },
      });
    }
    console.log(`  ✓ Seeded ${skillsData.length} skills`);
  }
}

async function seedFallbackSkills() {
  const areas = [
    { id: 'area-1', title: 'Практическая жизнь', icon: '🏠', color: '#F59E0B', sortOrder: 1 },
    { id: 'area-2', title: 'Сенсорика', icon: '👁️', color: '#10B981', sortOrder: 2 },
    { id: 'area-3', title: 'Язык', icon: '📖', color: '#3B82F6', sortOrder: 3 },
    { id: 'area-4', title: 'Математика', icon: '🔢', color: '#8B5CF6', sortOrder: 4 },
    { id: 'area-5', title: 'Окружающий мир', icon: '🌍', color: '#EF4444', sortOrder: 5 },
  ];

  for (const area of areas) {
    await prisma.area.create({ data: area });
  }

  const skillGroups = [
    { id: 'sg-1', title: 'Уход за собой', areaId: 'area-1', sortOrder: 1 },
    { id: 'sg-2', title: 'Уход за окружающей средой', areaId: 'area-1', sortOrder: 2 },
    { id: 'sg-3', title: 'Зрительное восприятие', areaId: 'area-2', sortOrder: 1 },
    { id: 'sg-4', title: 'Тактильное восприятие', areaId: 'area-2', sortOrder: 2 },
    { id: 'sg-5', title: 'Устная речь', areaId: 'area-3', sortOrder: 1 },
    { id: 'sg-6', title: 'Письмо', areaId: 'area-3', sortOrder: 2 },
    { id: 'sg-7', title: 'Числа и счёт', areaId: 'area-4', sortOrder: 1 },
    { id: 'sg-8', title: 'Природа', areaId: 'area-5', sortOrder: 1 },
  ];

  for (const sg of skillGroups) {
    await prisma.skillGroup.create({ data: sg });
  }

  const skills = [
    { id: 'sk-1', title: 'Мытьё рук', groupId: 'sg-1', sortOrder: 1 },
    { id: 'sk-2', title: 'Застёгивание пуговиц', groupId: 'sg-1', sortOrder: 2 },
    { id: 'sk-3', title: 'Завязывание шнурков', groupId: 'sg-1', sortOrder: 3 },
    { id: 'sk-4', title: 'Мытьё стола', groupId: 'sg-2', sortOrder: 1 },
    { id: 'sk-5', title: 'Цилиндры-вкладыши', groupId: 'sg-3', sortOrder: 1 },
    { id: 'sk-6', title: 'Розовая башня', groupId: 'sg-3', sortOrder: 2 },
    { id: 'sk-7', title: 'Коричневая лестница', groupId: 'sg-3', sortOrder: 3 },
    { id: 'sk-8', title: 'Красные штанги', groupId: 'sg-3', sortOrder: 4 },
    { id: 'sk-9', title: 'Цветные таблички', groupId: 'sg-3', sortOrder: 5 },
    { id: 'sk-10', title: 'Ткани на ощупь', groupId: 'sg-4', sortOrder: 1 },
    { id: 'sk-11', title: 'Пересыпание', groupId: 'sg-1', sortOrder: 4 },
    { id: 'sk-12', title: 'Металлические вкладыши', groupId: 'sg-6', sortOrder: 1 },
    { id: 'sk-13', title: 'Цифры из шероховатой бумаги', groupId: 'sg-7', sortOrder: 1 },
    { id: 'sk-14', title: 'Числовые штанги', groupId: 'sg-7', sortOrder: 2 },
    { id: 'sk-15', title: 'Классификация животных', groupId: 'sg-8', sortOrder: 1 },
  ];

  for (const skill of skills) {
    await prisma.skill.create({ data: skill });
  }

  console.log(`  ✓ Seeded fallback: ${areas.length} areas, ${skillGroups.length} groups, ${skills.length} skills`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
