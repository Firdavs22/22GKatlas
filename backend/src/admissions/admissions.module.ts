import {
  BadRequestException,
  ConflictException,
  Injectable,
  Module,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import { hash } from 'bcryptjs';
export interface AdmissionInput {
  requestKey: string;
  groupId: string;
  startsOn: string;
  monthlyFee?: number;
  parentName: string;
  phone: string;
  email?: string;
  parentId?: string;
  childName: string;
  birthDate: string;
  childId?: string;
}
@Injectable()
export class AdmissionsService {
  constructor(private prisma: PrismaService) {}
  async enroll(
    tx: Prisma.TransactionClient,
    dto: AdmissionInput,
    actorId: string,
  ) {
    const old = await tx.enrollment.findUnique({
      where: { requestKey: dto.requestKey },
      include: { child: { include: { parents: true } } },
    });
    if (old) return old;
    const startsOn = new Date(dto.startsOn + 'T00:00:00Z'),
      birthDate = new Date(dto.birthDate + 'T00:00:00Z');
    if (
      !Number.isFinite(startsOn.getTime()) ||
      startsOn.toISOString().slice(0, 10) !== dto.startsOn ||
      !Number.isFinite(birthDate.getTime()) ||
      birthDate.toISOString().slice(0, 10) !== dto.birthDate ||
      birthDate > new Date() ||
      birthDate > startsOn
    )
      throw new BadRequestException(
        'Проверьте даты рождения и начала посещения',
      );
    await tx.$queryRaw`SELECT id FROM "Group" WHERE id = ${dto.groupId} FOR UPDATE`;
    const group = await tx.group.findUnique({ where: { id: dto.groupId } });
    if (!group) throw new NotFoundException('Группа не найдена');
    const email = dto.email?.trim().toLowerCase();
    if (!dto.parentId && !email)
      throw new BadRequestException(
        'Для кабинета родителя укажите email или выберите существующего родителя',
      );
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'admission-parent:' + (dto.parentId || email)}))`;
    let parent = dto.parentId
      ? await tx.user.findUnique({ where: { id: dto.parentId } })
      : await tx.user.findUnique({ where: { email: email! } });
    if (
      parent &&
      (parent.role !== 'parent' || parent.deletedAt || parent.blockedAt)
    )
      throw new ConflictException('Аккаунт родителя недоступен');
    if (dto.parentId && !parent)
      throw new NotFoundException('Родитель не найден');
    if (!parent)
      parent = await tx.user.create({
        data: {
          email: email!,
          phone: dto.phone,
          name: dto.parentName,
          role: 'parent',
          password: await hash(randomBytes(32).toString('hex'), 10),
        },
      });
    if (dto.childId)
      await tx.$queryRaw`SELECT id FROM "Child" WHERE id = ${dto.childId} FOR UPDATE`;
    let child = dto.childId
      ? await tx.child.findUnique({
          where: { id: dto.childId },
          include: { parents: true },
        })
      : null;
    if (
      dto.childId &&
      (!child || !child.parents.some((p) => p.parentId === parent!.id))
    )
      throw new BadRequestException(
        'Выбранный ребёнок не связан с этим родителем',
      );
    if (
      !child &&
      (await tx.child.findFirst({
        where: {
          name: { equals: dto.childName.trim(), mode: 'insensitive' },
          birthDate,
          parents: { some: { parentId: parent.id } },
        },
      }))
    )
      throw new ConflictException(
        'Ребёнок уже есть. Выберите его при зачислении',
      );
    const occupied = await tx.child.count({
      where: {
        groupId: group.id,
        status: 'active',
        ...(child ? { id: { not: child.id } } : {}),
      },
    });
    if (occupied >= group.capacity)
      throw new ConflictException('В группе нет свободных мест');
    if (!dto.childName.trim())
      throw new BadRequestException('Укажите имя ребёнка');
    const monthlyFee = dto.monthlyFee ?? group.monthlyFee;
    const data = {
      groupId: group.id,
      enrolledAt: startsOn,
      monthlyFee,
      inAdaptation: true,
      status: 'active' as const,
    };
    if (child)
      child = await tx.child.update({
        where: { id: child.id },
        data,
        include: { parents: true },
      });
    else
      child = await tx.child.create({
        data: {
          ...data,
          name: dto.childName.trim(),
          birthDate,
          contacts: [
            { name: dto.parentName, phone: dto.phone, relation: 'Родитель' },
          ],
          parents: { create: { parentId: parent.id } },
        },
        include: { parents: true },
      });
    return tx.enrollment.create({
      data: {
        requestKey: dto.requestKey,
        parentId: parent.id,
        childId: child.id,
        groupId: group.id,
        groupName: group.name,
        startsOn,
        monthlyFee,
        actorId,
      },
      include: { child: { include: { parents: true } } },
    });
  }
  // The core portal can assign a group without CRM being enabled.
  async assignGroup(childId: string, groupId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Group" WHERE id = ${groupId} FOR UPDATE`;
      const group = await tx.group.findUnique({ where: { id: groupId } });
      if (!group) throw new NotFoundException('Группа не найдена');
      await tx.$queryRaw`SELECT id FROM "Child" WHERE id = ${childId} FOR UPDATE`;
      const child = await tx.child.findUnique({ where: { id: childId } });
      if (!child) throw new NotFoundException('Ребёнок не найден');
      if (
        child.groupId !== groupId &&
        (await tx.child.count({ where: { groupId, status: 'active' } })) >=
          group.capacity
      )
        throw new ConflictException('В группе нет свободных мест');
      return tx.child.update({ where: { id: childId }, data: { groupId } });
    });
  }
}
@Module({ providers: [AdmissionsService], exports: [AdmissionsService] })
export class AdmissionsModule {}
