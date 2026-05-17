/**
 * Soft reset:
 *   • keep 5 role-test accounts (admin/teacher/parent/psychologist/pediatrician @test.com)
 *   • keep 1 group (the oldest one, assigned to teacher@test.com)
 *   • keep 1 child in that group (the oldest), linked to parent@test.com
 *     and to both specialists
 *   • drop EVERYTHING else: areas/skills, progress, observations, portfolio,
 *     attendance, payments, home tasks, chats, feed, events, KB, schedules,
 *     specialist notes, appointment slots, notifications, refresh tokens.
 *
 * The child keeps no skill data — fresh slate to start over via UI.
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
  console.log('🧹 Soft reset — keeping 5 accounts + 1 group + 1 child');

  // 1. Resolve which 5 users to keep.
  const keepers = await prisma.user.findMany({
    where: { email: { in: KEEP_EMAILS } },
    select: { id: true, email: true, role: true },
  });
  const byRole = Object.fromEntries(keepers.map(u => [u.role, u]));
  const keepIds = new Set(keepers.map(u => u.id));
  console.log(`Kept users: ${keepers.map(u => u.email).join(', ')}`);

  // 2. Pick the oldest group + oldest child in it (if any exist).
  const allGroups = await prisma.group.findMany({
    orderBy: { id: 'asc' },
    take: 1,
  });
  const keepGroup = allGroups[0] || null;

  const keepChild = keepGroup
    ? await prisma.child.findFirst({
        where: { groupId: keepGroup.id },
        orderBy: { createdAt: 'asc' },
      })
    : null;

  if (keepGroup) console.log(`Kept group: ${keepGroup.id} (${keepGroup.name})`);
  if (keepChild) console.log(`Kept child: ${keepChild.id} (${keepChild.name})`);
  if (!keepChild) console.log('No child found — DB will end with just the 5 users.');

  // 3. Wipe everything that doesn't reference the kept group/child.
  //    Leaf records first so FKs don't block.
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
  await prisma.kbArticle.deleteMany({});
  await prisma.kbCategory.deleteMany({});

  // Skill graph + schedule belong to group/area space — wipe wholesale.
  await prisma.schedule.deleteMany({});
  await prisma.skill.deleteMany({});
  await prisma.skillGroup.deleteMany({});
  await prisma.area.deleteMany({});

  // 4. Drop other children and group links not pointing at our keeper(s).
  if (keepChild) {
    await prisma.childParent.deleteMany({ where: { NOT: { childId: keepChild.id } } });
    await prisma.childSpecialist.deleteMany({ where: { NOT: { childId: keepChild.id } } });
    await prisma.child.deleteMany({ where: { NOT: { id: keepChild.id } } });
  } else {
    await prisma.childParent.deleteMany({});
    await prisma.childSpecialist.deleteMany({});
    await prisma.child.deleteMany({});
  }

  // 5. Drop groups except the keeper.
  if (keepGroup) {
    await prisma.group.updateMany({
      where: { NOT: { id: keepGroup.id } },
      data: { teacherId: null },
    });
    await prisma.group.deleteMany({ where: { NOT: { id: keepGroup.id } } });
  } else {
    await prisma.group.updateMany({ data: { teacherId: null } });
    await prisma.group.deleteMany({});
  }

  // 6. Pin keeper group to teacher@test.com if available, clear otherwise.
  if (keepGroup && byRole.teacher) {
    await prisma.group.update({
      where: { id: keepGroup.id },
      data: { teacherId: byRole.teacher.id },
    });
  } else if (keepGroup) {
    await prisma.group.update({
      where: { id: keepGroup.id },
      data: { teacherId: null },
    });
  }

  // 7. Re-link keeper child to parent@test.com + both specialists.
  if (keepChild && byRole.parent) {
    await prisma.childParent.deleteMany({ where: { childId: keepChild.id } });
    await prisma.childParent.create({
      data: { childId: keepChild.id, parentId: byRole.parent.id },
    });
  }
  if (keepChild) {
    await prisma.childSpecialist.deleteMany({ where: { childId: keepChild.id } });
    if (byRole.psychologist) {
      await prisma.childSpecialist.create({
        data: {
          childId: keepChild.id,
          specialistId: byRole.psychologist.id,
          role: 'psychologist',
        },
      });
    }
    if (byRole.pediatrician) {
      await prisma.childSpecialist.create({
        data: {
          childId: keepChild.id,
          specialistId: byRole.pediatrician.id,
          role: 'pediatrician',
        },
      });
    }
  }

  // 8. Drop every user that isn't one of the 5 keepers.
  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { notIn: [...keepIds] } },
  });
  console.log(`Deleted ${deletedUsers.count} non-keeper users.`);

  console.log('\n✅ Done.');
  if (keepGroup) console.log('Login as parent@test.com / parent123 to see the kept child.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
