import { Controller, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ScheduleService } from './schedule.service';

@Controller('schedule')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ScheduleController {
  constructor(private scheduleService: ScheduleService) {}

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) { return this.scheduleService.update(id, dto); }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.scheduleService.delete(id); }
}
