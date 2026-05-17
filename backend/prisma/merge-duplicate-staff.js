/**
 * Merge duplicate staff users (same `name` + `role`, different `id`).
 *
 * For each duplicate group: picks the user with the most existing child links
 * as canonical (tie-broken by oldest createdAt). All foreign keys pointing at
 * the duplicates are reassigned to the canonical user. The duplicates are then
 * deleted.
 *
 * Skips groups that have just one user. Safe to re-run.
 *
 * Tables touched (grep schema.prisma for `User @relation`):
 *   Group.teacherId (unique → only one can exist, dupes already have null)
 *   ChildParent.parentId
 *   ChildSpecialist.specialistId (composite PK with childId)
 *   ChatParticipant.userId (composite PK with chatRoomId)
 *   ChatMessage.senderId
 *   Observation.userId
 *   HomeTask.authorId
 *   FeedItem.authorId
 *   FeedLike.userId (composite PK with feedItemId)
 *   SpecialistNote.specialistId
 *   Notification.userId (cascade)
 *   Menu.authorId
 *   Event.authorId
 *   Broadcast.authorId
 *   AppointmentSlot.specialistId (if model has it — script tolerates missing)
 *   RefreshToken.userId (cascade — duplicates lose their tokens, fine)
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function key(u) {
  return `${(u.name || '').trim().toLowerCase()}|${u.role}`;
}

async function countChildLinks(userId) {
  const [asTeacher, asSpecialist, asParent] = await Promise.all([
    prisma.group.count({ where: { teacherId: userId } }),
    prisma.childSpecialist.count({ where: { specialistId: userId } }),
    prisma.childParent.count({ where: { parentId: userId } }),
  ]);
  return asTeacher + asSpecialist + asParent;
}

async function reassignSimple(table, field, fromId, toId) {
  try {
    const r = await prisma[table].updateMany({
      where: { [field]: fromId },
      data: { [field]: toId },
    });
    if (r.count > 0) console.log(`    ${table}.${field}: moved ${r.count}`);
  } catch (e) {
    console.warn(`    ${table}.${field}: skipped (${e.message.split('\n')[0]})`);
  }
}

/** For composite-PK tables we must reassign one row at a time and skip rows
 *  that would collide with an existing canonical row. */
async function reassignChildSpecialist(fromId, toId) {
  const links = await prisma.childSpecialist.findMany({ where: { specialistId: fromId } });
  let moved = 0;
  for (const link of links) {
    const exists = await prisma.childSpecialist.findUnique({
      where: { childId_specialistId: { childId: link.childId, specialistId: toId } },
    });
    if (exists) {
      await prisma.childSpecialist.delete({
        where: { childId_specialistId: { childId: link.childId, specialistId: fromId } },
      });
    } else {
      await prisma.childSpecialist.update({
        where: { childId_specialistId: { childId: link.childId, specialistId: fromId } },
        data: { specialistId: toId },
      });
      moved++;
    }
  }
  if (moved > 0 || links.length > 0) {
    console.log(`    childSpecialist: moved ${moved}, removed dup-rows ${links.length - moved}`);
  }
}

async function reassignChatParticipant(fromId, toId) {
  const rows = await prisma.chatParticipant.findMany({ where: { userId: fromId } });
  let moved = 0;
  for (const row of rows) {
    const exists = await prisma.chatParticipant.findUnique({
      where: { chatRoomId_userId: { chatRoomId: row.chatRoomId, userId: toId } },
    });
    if (exists) {
      await prisma.chatParticipant.delete({
        where: { chatRoomId_userId: { chatRoomId: row.chatRoomId, userId: fromId } },
      });
    } else {
      await prisma.chatParticipant.update({
        where: { chatRoomId_userId: { chatRoomId: row.chatRoomId, userId: fromId } },
        data: { userId: toId },
      });
      moved++;
    }
  }
  if (rows.length > 0) {
    console.log(`    chatParticipant: moved ${moved}, removed dup-rows ${rows.length - moved}`);
  }
}

async function reassignGroupTeacher(fromId, toId) {
  // Group.teacherId is @unique, so only one can hold it. If canonical already
  // has a group, just clear the duplicate's link.
  const canonicalGroup = await prisma.group.findFirst({ where: { teacherId: toId } });
  const dupGroup = await prisma.group.findFirst({ where: { teacherId: fromId } });
  if (!dupGroup) return;
  if (canonicalGroup) {
    await prisma.group.update({ where: { id: dupGroup.id }, data: { teacherId: null } });
    console.log(`    group.teacherId: cleared on ${dupGroup.id} (canonical already teaches another)`);
  } else {
    await prisma.group.update({ where: { id: dupGroup.id }, data: { teacherId: toId } });
    console.log(`    group.teacherId: moved on ${dupGroup.id}`);
  }
}

async function mergeOne(dup, canonical) {
  console.log(`  merging ${dup.id} (${dup.email}) → ${canonical.id} (${canonical.email})`);

  await reassignGroupTeacher(dup.id, canonical.id);
  await reassignChildSpecialist(dup.id, canonical.id);
  await reassignChatParticipant(dup.id, canonical.id);

  // Simple FKs (non-composite, non-unique).
  await reassignSimple('childParent', 'parentId', dup.id, canonical.id);
  await reassignSimple('chatMessage', 'senderId', dup.id, canonical.id);
  await reassignSimple('observation', 'userId', dup.id, canonical.id);
  await reassignSimple('homeTask', 'authorId', dup.id, canonical.id);
  await reassignSimple('feedItem', 'authorId', dup.id, canonical.id);
  await reassignSimple('specialistNote', 'specialistId', dup.id, canonical.id);
  await reassignSimple('menu', 'authorId', dup.id, canonical.id);
  await reassignSimple('event', 'authorId', dup.id, canonical.id);
  await reassignSimple('broadcast', 'authorId', dup.id, canonical.id);
  await reassignSimple('notification', 'userId', dup.id, canonical.id);
  // RefreshToken — cascade-delete on user, we don't move them.
  await prisma.refreshToken.deleteMany({ where: { userId: dup.id } });
  // FeedLike — composite. Just drop duplicate's likes; they're noise.
  await prisma.feedLike.deleteMany({ where: { userId: dup.id } });

  await prisma.user.delete({ where: { id: dup.id } });
  console.log(`    deleted user ${dup.id}`);
}

async function main() {
  const users = await prisma.user.findMany({
    where: { role: { in: ['pediatrician', 'psychologist', 'teacher', 'parent'] } },
    select: { id: true, name: true, role: true, email: true, createdAt: true },
  });

  const groups = new Map();
  for (const u of users) {
    const k = key(u);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(u);
  }

  const dupeGroups = [...groups.entries()].filter(([, list]) => list.length > 1);
  console.log(`Found ${dupeGroups.length} duplicate groups.`);

  for (const [k, list] of dupeGroups) {
    console.log(`\nGroup "${k}" — ${list.length} users:`);

    const scored = await Promise.all(
      list.map(async u => ({ user: u, score: await countChildLinks(u.id) })),
    );
    // Sort: most child-links first; ties → oldest createdAt wins.
    scored.sort((a, b) =>
      b.score - a.score || new Date(a.user.createdAt) - new Date(b.user.createdAt),
    );
    const canonical = scored[0].user;
    const dupes = scored.slice(1).map(s => s.user);
    console.log(`  canonical: ${canonical.id} (${canonical.email}, ${scored[0].score} child links)`);

    for (const dup of dupes) {
      await mergeOne(dup, canonical);
    }
  }

  console.log('\n✅ Done.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
