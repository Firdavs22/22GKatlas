import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { SKIP_CHILD_ACCESS_KEY } from '../decorators/skip-child-access.decorator';

@Injectable()
export class ChildAccessGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if this endpoint is marked to skip child access check
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_CHILD_ACCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const req = context.switchToHttp().getRequest();
    const childId = req.params?.id;
    const user = req.user;

    // If no childId in params, skip (e.g. list endpoints)
    if (!childId) return true;
    if (!user) throw new ForbiddenException();

    // Admin/superadmin — полный доступ
    if (user.role === 'admin' || user.role === 'superadmin') return true;

    // Психолог и педиатр — штатные сотрудники, видят всех активных детей сада.
    // Связь ChildSpecialist остаётся как метка «подопечный», но не ограничивает доступ.
    if (user.role === 'psychologist' || user.role === 'pediatrician') {
      const child = await this.prisma.child.findFirst({
        where: { id: childId, status: 'active' },
        select: { id: true },
      });
      if (!child) throw new ForbiddenException('Ребёнок не найден или отчислен');
      return true;
    }

    // Teacher — only children in their group
    if (user.role === 'teacher') {
      const child = await this.prisma.child.findFirst({
        where: { id: childId, group: { teacherId: user.id } },
        select: { id: true },
      });
      if (!child) throw new ForbiddenException('Нет доступа к данным этого ребёнка');
      return true;
    }

    // Parent — only their linked children
    if (user.role === 'parent') {
      const rel = await this.prisma.childParent.findUnique({
        where: { childId_parentId: { childId, parentId: user.id } },
        select: { childId: true },
      });
      if (!rel) throw new ForbiddenException('Нет доступа к данным этого ребёнка');
      return true;
    }

    throw new ForbiddenException();
  }
}
