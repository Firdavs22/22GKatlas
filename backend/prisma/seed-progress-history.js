const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const STAGES = ['none', 'presented', 'practicing', 'mastered'];

function pickStageByPercent(p) {
  if (p < 0.20) return 'none';
  if (p < 0.45) return 'presented';
  if (p < 0.70) return 'practicing';
  return 'mastered';
}

async function main() {
  console.log('Seeding realistic progress + history for Alisa...');

  const child = await prisma.child.findFirst({ where: { name: { contains: 'Алиса' } } });
  if (!child) { console.error('Алиса not found'); process.exit(1); }

  const teacher = await prisma.user.findUnique({ where: { email: 'teacher@test.com' } });
  if (!teacher) { console.error('teacher not found'); process.exit(1); }

  // Clean existing progress for Алиса
  await prisma.progressHistory.deleteMany({ where: { progress: { childId: child.id } } });
  await prisma.progress.deleteMany({ where: { childId: child.id } });

  const areas = await prisma.area.findMany({
    include: { groups: { include: { skills: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } } },
    orderBy: { sortOrder: 'asc' },
  });

  // For each area, take first 30% of skills (capped at 8 per area), seed realistic mastery
  let totalCreated = 0, totalHistory = 0;

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  // Per-area mastery profile (how strong is Алиса in this area, 0..1)
  const areaProfile = {
    'import-area-упражнения-практической-жизни': 0.85,  // strong
    'import-area-сенсорика':                       0.70,  // good
    'import-area-математика':                      0.45,  // beginner+
    'import-area-язык':                            0.60,  // medium
    'import-area-космическое-воспитание':          0.35,  // beginner
    'import-area-социально-эмоциональное-развитие':0.75,  // good
    'import-area-физическое-развитие':             0.80,  // good
    'area-practical':                              0.85,
    'area-sensory':                                0.70,
    'area-math':                                   0.45,
    'area-language':                               0.60,
    'area-cosmos':                                 0.30,
  };

  for (const area of areas) {
    const profile = areaProfile[area.id] ?? 0.5;
    let areaIdx = 0;

    for (const group of area.groups) {
      const take = Math.min(group.skills.length, 6);
      for (let i = 0; i < take; i++) {
        const skill = group.skills[i];
        areaIdx++;

        // Spread mastery: first skills in each group more mastered, later ones less
        // Use index within group (i) instead of cumulative areaIdx so each group gets full range
        const skillStrength = profile * (1 - 0.08 * i) + (Math.random() - 0.5) * 0.1;
        const targetStage = pickStageByPercent(skillStrength);

        if (targetStage === 'none') continue; // skip — leave as no record

        const progress = await prisma.progress.create({
          data: {
            childId: child.id,
            skillId: skill.id,
            stage: targetStage,
            updatedById: teacher.id,
          },
        });
        totalCreated++;

        // Build history: walk through stages up to targetStage with realistic dates
        const targetIdx = STAGES.indexOf(targetStage);
        // Total window: spread events between 90 days ago and today
        // Each transition gets its own date, monotonically increasing
        const transitionsCount = targetIdx; // 1..3
        const daysBack = [90, 60, 30, 14, 7, 3];
        const startDays = 90;
        const stepDays = Math.floor(startDays / Math.max(transitionsCount, 1));

        let curStage = 'none';
        for (let t = 1; t <= targetIdx; t++) {
          const newStage = STAGES[t];
          // earlier transitions: longer ago; last transition: most recent (last one within ~20 days)
          // Spread: transition t out of N transitions, offset ranges from ~startDays to ~7
          const progressRatio = t / transitionsCount; // 0..1, increases over transitions
          const offsetDays = Math.floor(startDays * (1 - progressRatio) + 7 + Math.random() * 10);
          const changedAt = new Date(now.getTime() - offsetDays * dayMs);
          await prisma.progressHistory.create({
            data: {
              progressId: progress.id,
              oldStage: curStage,
              newStage,
              changedAt,
              changedBy: teacher.id,
            },
          });
          curStage = newStage;
          totalHistory++;
        }
      }
    }
  }

  console.log(`Created ${totalCreated} progress entries, ${totalHistory} history records for ${child.name}`);
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
