import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liveness + readiness in one endpoint.
   * Returns 200 only if Postgres is reachable.
   * Docker healthcheck and UptimeRobot poll this.
   */
  @Get()
  async check() {
    const checks: Record<string, 'ok' | string> = {};
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.db = 'ok';
    } catch (e) {
      checks.db = (e as Error).message;
      throw new ServiceUnavailableException({ status: 'down', checks });
    }
    return {
      status: 'ok',
      uptime: process.uptime(),
      checks,
      version: process.env.APP_VERSION || 'dev',
    };
  }
}
