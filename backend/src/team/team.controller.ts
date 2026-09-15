import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Feature, FeatureGuard } from '../features/features.module';
import { TeamService } from './team.service';
import { ClockService } from './clock.service';
import type { Request } from 'express';
import type { Actor } from './team.service';
import {
  EventQuery,
  MonthQuery,
  RevisionDto,
  TeamEventDto,
  TimeEntryDto,
  CloseClockDto,
  StartClockDto,
  StopClockDto,
} from './team.dto';

@Controller('team')
@Feature('team')
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
@Roles(
  'admin',
  'superadmin',
  'teacher',
  'methodist',
  'psychologist',
  'pediatrician',
)
export class TeamController {
  constructor(
    private team: TeamService,
    private clock: ClockService,
  ) {}
  @Get('clock') clockStatus(@CurrentUser() user: Actor, @Req() req: Request) {
    return this.clock.status(user, req.ip || '');
  }
  @Post('clock/start') startClock(
    @CurrentUser() user: Actor,
    @Req() req: Request,
    @Body() dto: StartClockDto,
  ) {
    return this.clock.start(user, req.ip || '', dto.requestId);
  }
  @Post('clock/stop') stopClock(
    @CurrentUser() user: Actor,
    @Req() req: Request,
    @Body() dto: StopClockDto,
  ) {
    return this.clock.stop(user, req.ip || '', dto.sessionId);
  }
  @Post('clock/:userId/close') closeClock(
    @Param('userId') id: string,
    @CurrentUser() user: Actor,
    @Req() req: Request,
    @Body() dto: CloseClockDto,
  ) {
    return this.clock.closeByManager(
      id,
      user,
      req.ip || '',
      dto.sessionId,
      dto.endedAt,
      dto.note,
    );
  }
  @Get('staff') staff() {
    return this.team.directory();
  }
  @Get('timesheet') sheet(@Query() q: MonthQuery, @CurrentUser() user: Actor) {
    return this.team.sheet(q.userId || user.id, q.month, user);
  }
  @Put('timesheet/:userId') save(
    @Param('userId') id: string,
    @Body() dto: TimeEntryDto,
    @CurrentUser() user: Actor,
  ) {
    return this.team.saveTime(id, dto, user);
  }
  @Post('timesheet/approve') approve(
    @Body() q: MonthQuery,
    @CurrentUser() user: Actor,
  ) {
    return this.team.approve(q.userId || user.id, q.month, user);
  }
  @Post('timesheet/reopen') reopen(
    @Body() q: MonthQuery,
    @CurrentUser() user: Actor,
  ) {
    return this.team.approve(q.userId || user.id, q.month, user, true);
  }
  @Get('timesheet/export') async export(
    @Query() q: MonthQuery,
    @CurrentUser() user: Actor,
    @Res() res: Response,
  ) {
    const buffer = await this.team.export(q.userId || user.id, q.month, user);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="timesheet-' + q.month + '.xlsx"',
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(buffer);
  }
  @Get('events') events(@Query() q: EventQuery, @CurrentUser() user: Actor) {
    return this.team.events(q, user);
  }
  @Post('events') createEvent(
    @Body() dto: TeamEventDto,
    @CurrentUser() user: Actor,
  ) {
    return this.team.saveEvent(dto, user);
  }
  @Put('events/:id') updateEvent(
    @Param('id') id: string,
    @Body() dto: TeamEventDto,
    @CurrentUser() user: Actor,
  ) {
    return this.team.saveEvent(dto, user, id);
  }
  @Post('events/:id/cancel') cancel(
    @Param('id') id: string,
    @Body() dto: RevisionDto,
    @CurrentUser() user: Actor,
  ) {
    return this.team.cancel(id, dto.revision, user);
  }
}
