import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  update(id: string, dto: any) { return this.prisma.schedule.update({ where: { id }, data: dto }); }
  delete(id: string) { return this.prisma.schedule.delete({ where: { id } }); }
}
