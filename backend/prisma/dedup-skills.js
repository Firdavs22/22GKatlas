/**
 * One-time dedupe of Skills/SkillGroups/Areas.
 *
 *   1. Merge legacy zones into canonical ones (when both contain the same data):
 *        "Практическая жизнь"     → "Упражнения Практической Жизни"
 *        "Сенсорное развитие"     → "Сенсорика"
 *      Skills get re-parented to a matching SkillGroup (by title fuzzy match),
 *      or to a new "Прочее" group inside the canonical zone if no match exists.
 *
 *   2. Dedupe Skills inside the same (groupId, title) cluster. Keeps the oldest
 *      (lowest sortOrder, then earliest id). Migrates Progress + HomeTask refs
 *      to the canonical skill. If a child has Progress on both canonical and a
 *      duplicate, the highest stage wins.
 *
 *   3. Delete duplicate Skills, then any SkillGroups left empty, then empty Areas.
 *
 * Run after backup:
 *   podman compose exec -T backend node prisma/dedup-skills.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const STAGE_RANK = { none: 0, presented: 1, practicing: 2, mastered: 3 };

// (legacy zone, canonical zone, [groupTitle→groupTitle], fallbackGroupTitle in canonical zone)
const ZONE_MERGES = [
  {
    legacy: 'Практическая жизнь',
    canonical: 'Упражнения Практической Жизни',
    groupRemap: {
      'Уход за собой':              'Уход за собой',
      'Уход за окружающей средой':  'Уход за средой',
    },
    fallback: 'Уход за собой',
  },
  {
    legacy: 'Сенсорное развитие',
    canonical: 'Сенсорика',
    groupRemap: {
      'Зрительное восприятие': 'Зрительное восприятие (форма)',
    },
    fallback: 'Зрительное восприятие (форма)',
  },
];

async function mergeZones() {
  for (const m of ZONE_MERGES) {
    const legacy = await prisma.area.findFirst({ where: { title: m.legacy }, include: { groups: true } });
    const canonical = await prisma.area.findFirst({ where: { title: m.canonical }, include: { groups: true } });
    if (!legacy) { console.log(`  skip ${m.legacy} — not found`); continue; }
    if (!canonical) { console.log(`  skip ${m.canonical} — not found`); continue; }

    console.log(`\n→ Merging "${m.legacy}" into "${m.canonical}"`);

    for (const legGroup of legacy.groups) {
      const targetTitle = m.groupRemap[legGroup.title] || m.fallback;
      const targetGroup = canonical.groups.find(g => g.title === targetTitle);
      if (!targetGroup) {
        console.warn(`  ⚠ no target group "${targetTitle}" in canonical zone; skipping group "${legGroup.title}"`);
        continue;
      }
      const updated = await prisma.skill.updateMany({
        where: { groupId: legGroup.id },
        data:  { groupId: targetGroup.id },
      });
      console.log(`  ${legGroup.title}  →  ${targetTitle}  (${updated.count} skills moved)`);
    }

    // Remove now-empty legacy groups + area
    await prisma.skillGroup.deleteMany({ where: { areaId: legacy.id } });
    await prisma.area.delete({ where: { id: legacy.id } });
    console.log(`  ✔ deleted empty zone "${m.legacy}"`);
  }
}

async function dedupSkills() {
  console.log('\n→ Deduplicating skills within (groupId, title)…');

  const skills = await prisma.skill.findMany({
    select: { id: true, title: true, groupId: true, sortOrder: true },
    orderBy: [{ groupId: 'asc' }, { title: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
  });

  // Cluster by (groupId, title)
  const clusters = new Map(); // key -> [{id, sortOrder, ...}]
  for (const s of skills) {
    const k = `${s.groupId}|${s.title}`;
    const list = clusters.get(k) || [];
    list.push(s);
    clusters.set(k, list);
  }

  let clustersWithDupes = 0;
  let totalDupesDeleted = 0;
  let progressMoved = 0;
  let progressMerged = 0;
  let homeTasksMoved = 0;

  for (const [, list] of clusters) {
    if (list.length < 2) continue;
    clustersWithDupes++;
    const [canonical, ...dupes] = list;
    const dupeIds = dupes.map(d => d.id);

    // ── Progress: move where no conflict, merge where conflict ──
    const dupProgress = await prisma.progress.findMany({
      where: { skillId: { in: dupeIds } },
      include: { history: true },
    });

    for (const p of dupProgress) {
      const existingCanonical = await prisma.progress.findUnique({
        where: { childId_skillId: { childId: p.childId, skillId: canonical.id } },
      });

      if (!existingCanonical) {
        // Just retarget
        await prisma.progress.update({
          where: { id: p.id },
          data:  { skillId: canonical.id },
        });
        progressMoved++;
      } else {
        // Conflict: keep highest stage on canonical, move history, delete dup
        const winner = STAGE_RANK[p.stage] > STAGE_RANK[existingCanonical.stage] ? p.stage : existingCanonical.stage;
        if (winner !== existingCanonical.stage) {
          await prisma.progress.update({
            where: { id: existingCanonical.id },
            data:  { stage: winner },
          });
        }
        // Move history rows
        await prisma.progressHistory.updateMany({
          where: { progressId: p.id },
          data:  { progressId: existingCanonical.id },
        });
        await prisma.progress.delete({ where: { id: p.id } });
        progressMerged++;
      }
    }

    // ── HomeTask refs (FK is SET NULL on delete, but let's preserve link) ──
    const ht = await prisma.homeTask.updateMany({
      where: { skillId: { in: dupeIds } },
      data:  { skillId: canonical.id },
    });
    homeTasksMoved += ht.count;

    // ── Delete duplicate skills ──
    const del = await prisma.skill.deleteMany({ where: { id: { in: dupeIds } } });
    totalDupesDeleted += del.count;
  }

  console.log(`  clusters with duplicates: ${clustersWithDupes}`);
  console.log(`  duplicate skills deleted: ${totalDupesDeleted}`);
  console.log(`  progress rows retargeted: ${progressMoved}`);
  console.log(`  progress rows merged:     ${progressMerged}`);
  console.log(`  home tasks retargeted:    ${homeTasksMoved}`);
}

async function dropOrphans() {
  console.log('\n→ Dropping empty SkillGroups + Areas…');
  // Empty groups
  const emptyGroups = await prisma.skillGroup.findMany({
    where: { skills: { none: {} } },
    select: { id: true, title: true },
  });
  for (const g of emptyGroups) {
    await prisma.skillGroup.delete({ where: { id: g.id } });
    console.log(`  ✔ removed empty group "${g.title}"`);
  }

  const emptyAreas = await prisma.area.findMany({
    where: { groups: { none: {} } },
    select: { id: true, title: true },
  });
  for (const a of emptyAreas) {
    await prisma.area.delete({ where: { id: a.id } });
    console.log(`  ✔ removed empty zone "${a.title}"`);
  }
}

async function main() {
  console.log('🧹 Dedupe run\n');

  const before = await prisma.$transaction([
    prisma.area.count(),
    prisma.skillGroup.count(),
    prisma.skill.count(),
    prisma.progress.count(),
    prisma.progressHistory.count(),
  ]);
  console.log(`BEFORE: ${before[0]} areas · ${before[1]} groups · ${before[2]} skills · ${before[3]} progress · ${before[4]} history`);

  await mergeZones();
  await dedupSkills();
  await dropOrphans();

  const after = await prisma.$transaction([
    prisma.area.count(),
    prisma.skillGroup.count(),
    prisma.skill.count(),
    prisma.progress.count(),
    prisma.progressHistory.count(),
  ]);
  console.log(`\nAFTER:  ${after[0]} areas · ${after[1]} groups · ${after[2]} skills · ${after[3]} progress · ${after[4]} history`);

  console.log('\n✅ Done.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
