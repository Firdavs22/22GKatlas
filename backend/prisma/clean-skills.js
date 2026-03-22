const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log('🧹 Clearing all areas, groups and skills...');
  await prisma.progressHistory.deleteMany();
  await prisma.progress.deleteMany();
  await prisma.homeTask.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.skillGroup.deleteMany();
  await prisma.area.deleteMany();
  console.log('✅ Everything deleted!');
}
main().finally(() => prisma.$disconnect());
