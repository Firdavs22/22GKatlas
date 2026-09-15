import { Prisma, PrismaClient } from '@prisma/client';
import type { AdmissionInput } from './admissions.module';

export async function checkAdmission(
  db: Prisma.TransactionClient | PrismaClient,
  dto: Partial<AdmissionInput>,
) {
  const missing: string[] = [];
  const date = (s?: string) => {
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const d = new Date(s + 'T00:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s
      ? d
      : null;
  };
  const birth = date(dto.birthDate),
    start = date(dto.startsOn);
  if (!dto.childName?.trim()) missing.push('Имя ребёнка');
  if (!birth || birth > new Date())
    missing.push('Корректная дата рождения ребёнка');
  if (!start || (birth && birth > start))
    missing.push('Корректная дата начала посещения');
  if (!dto.parentName?.trim()) missing.push('Имя родителя');
  if (!/^\+7\d{10}$/.test(dto.phone || '')) missing.push('Телефон родителя');
  const email = dto.email?.trim().toLowerCase();
  if (!dto.parentId && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    missing.push('Email для доступа родителя или существующий родитель');
  const parent = dto.parentId
    ? await db.user.findUnique({ where: { id: dto.parentId } })
    : email
      ? await db.user.findUnique({ where: { email } })
      : null;
  if (
    (dto.parentId && !parent) ||
    (parent &&
      (parent.role !== 'parent' || parent.blockedAt || parent.deletedAt))
  )
    missing.push(
      'Действующий аккаунт родителя: email сотрудника использовать нельзя',
    );
  const child = dto.childId
    ? await db.child.findUnique({
        where: { id: dto.childId },
        include: { parents: true },
      })
    : null;
  if (
    dto.childId &&
    (!child || !parent || !child.parents.some((p) => p.parentId === parent.id))
  )
    missing.push('Ребёнок, связанный с выбранным родителем');
  if (
    !dto.childId &&
    parent &&
    birth &&
    dto.childName?.trim() &&
    (await db.child.findFirst({
      where: {
        name: { equals: dto.childName.trim(), mode: 'insensitive' },
        birthDate: birth,
        parents: { some: { parentId: parent.id } },
      },
    }))
  )
    missing.push(
      'Ребёнок уже есть: выберите его в поле «Существующий ребёнок»',
    );
  const group = dto.groupId
    ? await db.group.findUnique({ where: { id: dto.groupId } })
    : null;
  if (!group) missing.push('Группа для зачисления');
  else if (
    (await db.child.count({
      where: {
        groupId: group.id,
        status: 'active',
        ...(child ? { id: { not: child.id } } : {}),
      },
    })) >= group.capacity
  )
    missing.push('Свободное место в группе');
  if (
    dto.monthlyFee !== undefined &&
    (!Number.isFinite(dto.monthlyFee) || dto.monthlyFee < 0)
  )
    missing.push('Неотрицательная месячная плата');
  return {
    ready: missing.length === 0,
    missing,
    parentAccess: parent?.consentGivenAt ? 'active' : 'invite',
    afterEnrollment: [
      'Фото ребёнка',
      'Представители, которые могут забирать ребёнка',
      'Сведения о документах и особенностях — по правилам сада',
    ],
  };
}
