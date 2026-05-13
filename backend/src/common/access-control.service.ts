import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccessControlService {
  constructor(private prisma: PrismaService) {}

  async checkChildAccess(childId: string, user: any) {
    if (user.role === 'admin') return;

    if (user.role === 'teacher') {
      const child = await this.prisma.child.findFirst({
        where: { id: childId, group: { teacherId: user.id } },
        select: { id: true },
      });
      if (!child) throw new ForbiddenException();
      return;
    }

    if (user.role === 'parent') {
      const rel = await this.prisma.childParent.findUnique({
        where: { childId_parentId: { childId, parentId: user.id } },
        select: { childId: true },
      });
      if (!rel) throw new ForbiddenException();
      return;
    }

    if (user.role === 'psychologist' || user.role === 'pediatrician') {
      const rel = await this.prisma.childSpecialist.findUnique({
        where: { childId_specialistId: { childId, specialistId: user.id } },
        select: { childId: true },
      });
      if (!rel) throw new ForbiddenException();
      return;
    }

    throw new ForbiddenException();
  }
}
