import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SiteContentService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<Record<string, unknown>> {
    const rows = await this.prisma.siteContent.findMany();
    const out: Record<string, unknown> = {};
    for (const r of rows) out[r.key] = r.value;
    return out;
  }

  async getOne(key: string): Promise<unknown> {
    const row = await this.prisma.siteContent.findUnique({ where: { key } });
    return row?.value ?? null;
  }

  async upsert(key: string, value: unknown) {
    return this.prisma.siteContent.upsert({
      where: { key },
      update: { value: value as object },
      create: { key, value: value as object },
    });
  }
}
