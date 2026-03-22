import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  getSchedule(groupId: string) {
    return this.prisma.schedule.findMany({
      where: { groupId },
      orderBy: [{ dayOfWeek: 'asc' }, { timeStart: 'asc' }],
    });
  }

  createScheduleItem(groupId: string, dto: any) {
    return this.prisma.schedule.create({ data: { ...dto, groupId } });
  }

  updateScheduleItem(scheduleId: string, dto: any) {
    return this.prisma.schedule.update({ where: { id: scheduleId }, data: dto });
  }

  deleteScheduleItem(scheduleId: string) {
    return this.prisma.schedule.delete({ where: { id: scheduleId } });
  }
}
