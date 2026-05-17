/**
 * Merge `import-area-*` duplicates into canonical Areas (and standalone new ones).
 *
 * Pairs matched by case-insensitive title. Canonical Area is the one WITHOUT the
 * `import-area-` id prefix. SkillGroups under the duplicate are reassigned to the
 * canonical Area; their Skills (and any Progress on those skills) stay attached
 * to the same SkillGroup rows, so history is preserved.
 *
 * Duplicates without a canonical counterpart (e.g. "Социально-эмоциональное
 * развитие", "Физическое развитие") are kept and just renamed by stripping the
 * id prefix — they become the canonical Area for that title.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function normalizeTitle(t) {
  return (t || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

async function main() {
  const areas = await prisma.area.findMany({ orderBy: { sortOrder: 'asc' } });

  const dupes = areas.filter(a => a.id.startsWith('import-area-'));
  const canonicals = areas.filter(a => !a.id.startsWith('import-area-'));

  console.log(`Found ${dupes.length} duplicate areas, ${canonicals.length} canonical.`);

  const byTitle = new Map(canonicals.map(a => [normalizeTitle(a.title), a]));

  let merged = 0;
  let promoted = 0;

  for (const dup of dupes) {
    const target = byTitle.get(normalizeTitle(dup.title));
    if (target) {
      const moved = await prisma.skillGroup.updateMany({
        where: { areaId: dup.id },
        data: { areaId: target.id },
      });
      await prisma.area.delete({ where: { id: dup.id } });
      console.log(`  merged "${dup.title}" → ${target.id} (${moved.count} groups moved)`);
      merged++;
    } else {
      const slug = dup.id.replace(/^import-area-/, '');
      const baseId = `area-${slug}`;
      const existing = await prisma.area.findUnique({ where: { id: baseId } });
      const finalId = existing ? `area-${slug}-${Date.now()}` : baseId;
      await prisma.area.create({
        data: {
          id: finalId,
          title: dup.title,
          icon: dup.icon,
          color: dup.color,
          sortOrder: dup.sortOrder,
        },
      });
      const moved = await prisma.skillGroup.updateMany({
        where: { areaId: dup.id },
        data: { areaId: finalId },
      });
      await prisma.area.delete({ where: { id: dup.id } });
      console.log(`  promoted "${dup.title}" to canonical id ${finalId} (${moved.count} groups)`);
      promoted++;
    }
  }

  console.log(`✅ Done. Merged ${merged}, promoted ${promoted}.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
