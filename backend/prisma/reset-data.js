/**
 * Wipe ALL data except the 5 role-test accounts.
 *
 * Keeps:
 *   admin@test.com, teacher@test.com, parent@test.com,
 *   psychologist@test.com, pediatrician@test.com
 *
 * Everything else — children, groups, areas/skills/progress, observations,
 * portfolio, schedules, payments, attendance, chats, feed, events, KB, etc. —
 * is deleted. After running, you can re-enter test data through the UI.
 *
 * Order of deletes matters because of FK constraints: leaf-first.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const KEEP_EMAILS = [
  'admin@test.com',
  'teacher@test.com',
  'parent@test.com',
  'psychologist@test.com',
  'pediatrician@test.com',
];

async function main() {
  console.log('🧹 Wiping data. Keeping users:', KEEP_EMAILS.join(', '));

  // Find the 5 keepers (whichever exist).
  const keepers = await prisma.user.findMany({
    where: { email: { in: KEEP_EMAILS } },
    select: { id: true, email: true, role: true },
  });
  const keepIds = new Set(keepers.map(u => u.id));
  console.log(`Keeping ${keepers.length} users:`);
  for (const k of keepers) console.log(`  ${k.email} (${k.role})`);

  // — Leaf records first —
  await prisma.refreshToken.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.feedLike.deleteMany({});
  await prisma.chatMessage.deleteMany({});
  await prisma.chatParticipant.deleteMany({});
  await prisma.chatRoom.deleteMany({});
  await prisma.appointmentBooking.deleteMany({});
  await prisma.appointmentSlot.deleteMany({});
  await prisma.progressHistory.deleteMany({});
  await prisma.progress.deleteMany({});
  await prisma.homeTask.deleteMany({});
  await prisma.specialistNote.deleteMany({});
  await prisma.observation.deleteMany({});
  await prisma.portfolioItem.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.feedItem.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.broadcast.deleteMany({});
  await prisma.menu.deleteMany({});
  await prisma.schedule.deleteMany({});
  await prisma.kbArticle.deleteMany({});
  await prisma.kbCategory.deleteMany({});
  await prisma.childSpecialist.deleteMany({});
  await prisma.childParent.deleteMany({});
  await prisma.skill.deleteMany({});
  await prisma.skillGroup.deleteMany({});
  await prisma.area.deleteMany({});

  // Child must drop before Group (Child references groupId).
  await prisma.child.deleteMany({});

  // Group must drop before User if any teacher-link constraint, but Group has
  // teacherId nullable so we can also just null it first.
  await prisma.group.updateMany({ data: { teacherId: null } });
  await prisma.group.deleteMany({});

  // Finally — delete every user except the 5 keepers.
  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { notIn: [...keepIds] } },
  });
  console.log(`Deleted ${deletedUsers.count} non-keeper users.`);

  console.log('\n✅ Done. Database now contains only role-test accounts.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
