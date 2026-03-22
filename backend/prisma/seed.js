const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Users
  const adminPass = await bcrypt.hash('admin123', 10);
  const teacherPass = await bcrypt.hash('teacher123', 10);
  const parentPass = await bcrypt.hash('parent123', 10);
  const psychPass = await bcrypt.hash('psych123', 10);
  const pedPass = await bcrypt.hash('ped123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: { email: 'admin@test.com', password: adminPass, name: 'Администратор', role: 'admin' },
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@test.com' },
    update: {},
    create: { email: 'teacher@test.com', password: teacherPass, name: 'Мария Ивановна', role: 'teacher' },
  });

  const parent = await prisma.user.upsert({
    where: { email: 'parent@test.com' },
    update: {},
    create: { email: 'parent@test.com', password: parentPass, name: 'Анна Петрова', role: 'parent' },
  });

  const psychologist = await prisma.user.upsert({
    where: { email: 'psych@test.com' },
    update: {},
    create: { email: 'psych@test.com', password: psychPass, name: 'Елена Сидорова', role: 'psychologist' },
  });

  const pediatrician = await prisma.user.upsert({
    where: { email: 'ped@test.com' },
    update: {},
    create: { email: 'ped@test.com', password: pedPass, name: 'Ольга Козлова', role: 'pediatrician' },
  });

  console.log('✅ Users created');

  // Group
  const group = await prisma.group.upsert({
    where: { id: 'group-solnyshko' },
    update: {},
    create: { id: 'group-solnyshko', name: 'Солнышко', ageRange: '3-6', year: 2026, teacherId: teacher.id },
  });

  console.log('✅ Group created');

  // Children
  const child1 = await prisma.child.upsert({
    where: { id: 'child-1' },
    update: {},
    create: { id: 'child-1', name: 'Алиса Петрова', birthDate: new Date('2020-05-15'), groupId: group.id },
  });

  const child2 = await prisma.child.upsert({
    where: { id: 'child-2' },
    update: {},
    create: { id: 'child-2', name: 'Максим Сидоров', birthDate: new Date('2021-02-10'), groupId: group.id },
  });

  const child3 = await prisma.child.upsert({
    where: { id: 'child-3' },
    update: {},
    create: { id: 'child-3', name: 'Софья Иванова', birthDate: new Date('2020-11-20'), groupId: group.id },
  });

  console.log('✅ Children created');

  // Parent-Child
  await prisma.childParent.upsert({
    where: { childId_parentId: { childId: child1.id, parentId: parent.id } },
    update: {},
    create: { childId: child1.id, parentId: parent.id },
  });

  // Specialists
  for (const child of [child1, child2, child3]) {
    await prisma.childSpecialist.upsert({
      where: { childId_specialistId: { childId: child.id, specialistId: psychologist.id } },
      update: {},
      create: { childId: child.id, specialistId: psychologist.id, role: 'psychologist' },
    });
    await prisma.childSpecialist.upsert({
      where: { childId_specialistId: { childId: child.id, specialistId: pediatrician.id } },
      update: {},
      create: { childId: child.id, specialistId: pediatrician.id, role: 'pediatrician' },
    });
  }

  console.log('✅ Relationships created');

  // Skills
  const area1 = await prisma.area.upsert({
    where: { id: 'area-practical' },
    update: {},
    create: { id: 'area-practical', title: 'Практическая жизнь', icon: '🏠', color: '#FF6B6B', sortOrder: 1 },
  });

  const area2 = await prisma.area.upsert({
    where: { id: 'area-sensory' },
    update: {},
    create: { id: 'area-sensory', title: 'Сенсорное развитие', icon: '👁️', color: '#4ECDC4', sortOrder: 2 },
  });

  const area3 = await prisma.area.upsert({
    where: { id: 'area-math' },
    update: {},
    create: { id: 'area-math', title: 'Математика', icon: '🔢', color: '#45B7D1', sortOrder: 3 },
  });

  const area4 = await prisma.area.upsert({
    where: { id: 'area-language' },
    update: {},
    create: { id: 'area-language', title: 'Язык', icon: '📖', color: '#96CEB4', sortOrder: 4 },
  });

  const area5 = await prisma.area.upsert({
    where: { id: 'area-cosmos' },
    update: {},
    create: { id: 'area-cosmos', title: 'Космическое воспитание', icon: '🌍', color: '#DDA0DD', sortOrder: 5 },
  });

  const sg1 = await prisma.skillGroup.upsert({
    where: { id: 'sg-self-care' },
    update: {},
    create: { id: 'sg-self-care', title: 'Уход за собой', areaId: area1.id, sortOrder: 1 },
  });

  const sg2 = await prisma.skillGroup.upsert({
    where: { id: 'sg-environment' },
    update: {},
    create: { id: 'sg-environment', title: 'Уход за окружающей средой', areaId: area1.id, sortOrder: 2 },
  });

  const sg3 = await prisma.skillGroup.upsert({
    where: { id: 'sg-visual' },
    update: {},
    create: { id: 'sg-visual', title: 'Зрительное восприятие', areaId: area2.id, sortOrder: 1 },
  });

  const sg4 = await prisma.skillGroup.upsert({
    where: { id: 'sg-counting' },
    update: {},
    create: { id: 'sg-counting', title: 'Счёт', areaId: area3.id, sortOrder: 1 },
  });

  const skills = [];
  const skillData = [
    { id: 'skill-1', title: 'Мытьё рук', groupId: sg1.id, sortOrder: 1 },
    { id: 'skill-2', title: 'Застёгивание пуговиц', groupId: sg1.id, sortOrder: 2 },
    { id: 'skill-3', title: 'Завязывание шнурков', groupId: sg1.id, sortOrder: 3 },
    { id: 'skill-4', title: 'Подметание', groupId: sg2.id, sortOrder: 1 },
    { id: 'skill-5', title: 'Полив цветов', groupId: sg2.id, sortOrder: 2 },
    { id: 'skill-6', title: 'Сортировка по цвету', groupId: sg3.id, sortOrder: 1 },
    { id: 'skill-7', title: 'Сортировка по форме', groupId: sg3.id, sortOrder: 2 },
    { id: 'skill-8', title: 'Счёт до 10', groupId: sg4.id, sortOrder: 1 },
    { id: 'skill-9', title: 'Счёт до 20', groupId: sg4.id, sortOrder: 2 },
  ];

  for (const s of skillData) {
    const skill = await prisma.skill.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
    skills.push(skill);
  }

  console.log('✅ Skills created');

  // Progress
  const progressData = [
    { childId: child1.id, skillId: 'skill-1', stage: 'mastered' },
    { childId: child1.id, skillId: 'skill-2', stage: 'practicing' },
    { childId: child1.id, skillId: 'skill-6', stage: 'presented' },
    { childId: child2.id, skillId: 'skill-1', stage: 'practicing' },
    { childId: child2.id, skillId: 'skill-8', stage: 'presented' },
    { childId: child3.id, skillId: 'skill-1', stage: 'mastered' },
    { childId: child3.id, skillId: 'skill-3', stage: 'mastered' },
    { childId: child3.id, skillId: 'skill-5', stage: 'practicing' },
  ];

  for (const p of progressData) {
    await prisma.progress.upsert({
      where: { childId_skillId: { childId: p.childId, skillId: p.skillId } },
      update: {},
      create: { ...p, updatedById: teacher.id },
    });
  }

  console.log('✅ Progress created');

  // Feed
  await prisma.feedItem.create({
    data: {
      type: 'school_news', scope: 'school', authorId: admin.id,
      title: 'Добро пожаловать в ГлобоАтлас!', text: 'Наш портал запущен.', pinned: true,
    },
  });

  await prisma.feedItem.create({
    data: {
      type: 'child_achievement', scope: 'child', authorId: teacher.id, childId: child1.id, groupId: group.id,
      title: 'Алиса освоила навык: Мытьё рук', text: 'Поздравляем!',
    },
  });

  console.log('✅ Feed items created');

  // Schedule
  const scheduleData = [
    { groupId: group.id, dayOfWeek: 1, timeStart: '08:00', timeEnd: '08:30', activity: 'Приём детей' },
    { groupId: group.id, dayOfWeek: 1, timeStart: '08:30', timeEnd: '09:00', activity: 'Утренний круг' },
    { groupId: group.id, dayOfWeek: 1, timeStart: '09:00', timeEnd: '10:30', activity: 'Свободная работа' },
    { groupId: group.id, dayOfWeek: 1, timeStart: '10:30', timeEnd: '11:00', activity: 'Перекус' },
    { groupId: group.id, dayOfWeek: 1, timeStart: '11:00', timeEnd: '12:00', activity: 'Прогулка' },
  ];

  for (const s of scheduleData) {
    await prisma.schedule.create({ data: s });
  }

  console.log('✅ Schedule created');

  // Observation
  await prisma.observation.create({
    data: {
      childId: child1.id, userId: teacher.id,
      text: 'Алиса самостоятельно помыла руки и вытерла полотенцем.',
      tags: ['самостоятельность', 'гигиена'], visible: true,
    },
  });

  console.log('✅ Observations created');

  // Attendance
  const today = new Date();
  await prisma.attendance.create({ data: { childId: child1.id, date: today, status: 'present' } });
  await prisma.attendance.create({ data: { childId: child2.id, date: today, status: 'present' } });
  await prisma.attendance.create({ data: { childId: child3.id, date: today, status: 'sick' } });

  console.log('✅ Attendance created');

  // Payment
  await prisma.payment.create({
    data: { childId: child1.id, month: new Date('2026-03-01'), amount: 35000, paid: 35000, status: 'paid' },
  });

  console.log('✅ Payments created');

  // Chat
  const chat = await prisma.chatRoom.create({
    data: {
      type: 'teacher_parent', childId: child1.id,
      participants: { create: [{ userId: teacher.id }, { userId: parent.id }] },
    },
  });

  await prisma.chatMessage.create({
    data: { chatRoomId: chat.id, senderId: teacher.id, text: 'Здравствуйте! Как дела у Алисы дома?' },
  });
  await prisma.chatMessage.create({
    data: { chatRoomId: chat.id, senderId: parent.id, text: 'Здравствуйте! Алиса в восторге от занятий!' },
  });

  console.log('✅ Chat created');

  console.log('\n🎉 Seed completed!\n');
  console.log('══════════════════════════════════════');
  console.log('  Тестовые аккаунты:');
  console.log('  admin@test.com    / admin123');
  console.log('  teacher@test.com  / teacher123');
  console.log('  parent@test.com   / parent123');
  console.log('  psych@test.com    / psych123');
  console.log('  ped@test.com      / ped123');
  console.log('══════════════════════════════════════');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
