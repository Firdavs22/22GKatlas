const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding 31 days of data for child-1...');

  const child = await prisma.child.findUnique({ where: { id: 'child-1' } });
  if (!child) throw new Error('Child 1 not found');
  
  const teacher = await prisma.user.findFirst({ where: { role: 'teacher' } });
  const group = await prisma.group.findFirst();
  const skills = await prisma.skill.findMany();
  
  const now = new Date();
  const days = 31;
  
  let currentProgress = {};
  const stages = ['none', 'presented', 'practicing', 'mastered'];
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    
    // Attendance
    if (Math.random() > 0.2 && i !== 0) {
      await prisma.attendance.create({
        data: { childId: child.id, date, status: 'present' }
      });
    }

    // Observation
    if (Math.random() > 0.7) {
      await prisma.observation.create({
        data: {
          childId: child.id, userId: teacher.id,
          text: `Наблюдение за ${date.toLocaleDateString()}: ребенок активно участвует в процессе и проявляет большой интерес к материалу. Концентрация улучшилась.`,
          visible: true,
          createdAt: date,
        }
      });
    }

    // Portfolio
    if (Math.random() > 0.8) {
      // Pick random area mock
      await prisma.portfolioItem.create({
        data: {
          childId: child.id, authorId: teacher.id,
          title: 'Творческая работа', description: 'Развивающее упражнение',
          date: date,
          type: 'Фото',
          fileUrl: 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
        }
      });
    }

    // Progress advancements
    const numAdvancements = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < numAdvancements; j++) {
      const skill = skills[Math.floor(Math.random() * skills.length)];
      const current = currentProgress[skill.id] || 'none';
      if (current === 'mastered') continue;
      
      const nextIdx = stages.indexOf(current) + 1;
      const nextStage = stages[nextIdx];
      
      const p = await prisma.progress.upsert({
        where: { childId_skillId: { childId: child.id, skillId: skill.id } },
        create: { childId: child.id, skillId: skill.id, stage: nextStage, updatedById: teacher.id },
        update: { stage: nextStage, updatedById: teacher.id }
      });
      
      await prisma.progressHistory.create({
        data: {
          progressId: p.id,
          oldStage: current,
          newStage: nextStage,
          changedAt: date,
          changedBy: teacher.id
        }
      });
      
      currentProgress[skill.id] = nextStage;
    }
  }

  console.log('✅ 31 days of historical data seeded successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
