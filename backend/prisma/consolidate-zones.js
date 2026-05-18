/**
 * Move SkillGroups out of pseudo-zones into Упражнения Практической Жизни.
 *
 * Rationale: «Социально-эмоциональное развитие» and «Физическое развитие» aren't
 * Montessori zones — they are dimensions (emotion / body) inferred from skills
 * across the 5 classical zones. The seed accidentally created them as zones too.
 *
 * Steps:
 *   1. Re-parent every SkillGroup of those two zones to «Упражнения Практической Жизни».
 *   2. Drop the now-empty pseudo-zones.
 *   3. (Skills keep their dimension flags — the mapper picks them up next run.)
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PSEUDO_ZONES = ['Социально-эмоциональное развитие', 'Физическое развитие'];
const TARGET_ZONE = 'Упражнения Практической Жизни';

async function main() {
  const target = await prisma.area.findFirst({ where: { title: TARGET_ZONE } });
  if (!target) throw new Error(`Target zone "${TARGET_ZONE}" not found`);

  let moved = 0, droppedZones = 0;
  for (const zoneTitle of PSEUDO_ZONES) {
    const zone = await prisma.area.findFirst({ where: { title: zoneTitle } });
    if (!zone) { console.log(`  skip ${zoneTitle} — not found`); continue; }

    const upd = await prisma.skillGroup.updateMany({
      where: { areaId: zone.id },
      data:  { areaId: target.id },
    });
    moved += upd.count;
    console.log(`  ${zoneTitle}: re-parented ${upd.count} groups to ${TARGET_ZONE}`);

    await prisma.area.delete({ where: { id: zone.id } });
    droppedZones++;
  }

  const after = await prisma.$transaction([
    prisma.area.count(),
    prisma.skillGroup.count(),
    prisma.skill.count(),
  ]);
  console.log(`\nAFTER: ${after[0]} areas · ${after[1]} groups · ${after[2]} skills`);
  console.log(`Moved ${moved} groups; dropped ${droppedZones} pseudo-zones.`);
  console.log('✅ Done.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
