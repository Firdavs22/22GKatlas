import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('limit') limit?: string,
    @Query('actor') actor?: string,
    @Query('method') method?: string,
    @Query('path') path?: string,
  ) {
    const take = Math.min(Number(limit) || 100, 500);
    const where: Record<string, unknown> = {};
    if (actor) where.actorId = actor;
    if (method) where.method = method;
    if (path) where.path = { contains: path };

    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });

    // Attach actor names in one query
    const actorIds = Array.from(new Set(rows.map(r => r.actorId).filter((x): x is string => Boolean(x))));
    const users = actorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const byId = new Map(users.map(u => [u.id, u]));
    return rows.map(r => ({
      ...r,
      actor: r.actorId ? byId.get(r.actorId) || { id: r.actorId, name: '(удалён)', email: null } : null,
    }));
  }
}
