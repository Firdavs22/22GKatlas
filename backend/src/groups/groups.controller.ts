import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GroupsService } from './groups.service';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  @Get(':id/schedule')
  getSchedule(@Param('id') id: string) { return this.groupsService.getSchedule(id); }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post(':id/schedule')
  createScheduleItem(@Param('id') id: string, @Body() dto: any) {
    return this.groupsService.createScheduleItem(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Put(':id/schedule/:scheduleId')
  updateScheduleItem(@Param('scheduleId') scheduleId: string, @Body() dto: any) {
    return this.groupsService.updateScheduleItem(scheduleId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':id/schedule/:scheduleId')
  deleteScheduleItem(@Param('scheduleId') scheduleId: string) {
    return this.groupsService.deleteScheduleItem(scheduleId);
  }
}
