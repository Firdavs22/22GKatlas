import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ChildAccessGuard } from '../common/guards/child-access.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SkipChildAccess } from '../common/decorators/skip-child-access.decorator';
import { ChildrenService } from './children.service';
import { ReportService } from './report.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  UpdateProgressDto, CreateObservationDto, CreatePortfolioItemDto,
  CreateNoteDto, CreateHomeTaskDto, UpdateHomeTaskDto,
} from './dto/children.dto';
import type { Response } from 'express';

@Controller('children')
@UseGuards(JwtAuthGuard, RolesGuard, ChildAccessGuard)
export class ChildrenController {
  constructor(
    private childrenService: ChildrenService,
    private reportService: ReportService,
  ) {}

  @Get()
  @SkipChildAccess()
  getChildren(@CurrentUser() user: any) { return this.childrenService.getChildrenForUser(user); }

  @Get('group-progress')
  @SkipChildAccess()
  getGroupProgress(@CurrentUser() user: any) { return this.childrenService.getGroupProgress(user); }

  @Get('group-heatmap')
  @SkipChildAccess()
  getGroupHeatmap(@CurrentUser() user: any) { return this.childrenService.getGroupHeatmap(user); }

  @Get(':id')
  getChild(@Param('id') id: string, @CurrentUser() user: any) { return this.childrenService.getChildProfile(id, user); }

  @Get(':id/progress')
  getProgress(@Param('id') id: string) { return this.childrenService.getProgress(id); }

  @Get(':id/development-summary')
  getDevelopmentSummary(@Param('id') id: string) {
    return this.childrenService.getDevelopmentSummary(id);
  }

  @Get(':id/dimension/:dimension')
  getDimensionDetail(
    @Param('id') id: string,
    @Param('dimension') dimension: 'emotion' | 'cognition' | 'body',
  ) {
    return this.childrenService.getDimensionDetail(id, dimension);
  }

  @Get(':id/report')
  async getReport(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.reportService.generateChildReport(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${id}.pdf"`);
    res.send(buffer);
  }

  @Get(':id/progress-history')
  getProgressHistory(@Param('id') id: string) { return this.childrenService.getProgressHistory(id); }

  @Put(':id/progress')
  @Roles('admin', 'teacher')
  updateProgress(@Param('id') id: string, @Body() dto: UpdateProgressDto, @CurrentUser() user: any) {
    return this.childrenService.updateProgress(id, dto, user);
  }

  @Get(':id/observations')
  getObservations(@Param('id') id: string, @CurrentUser() user: any) {
    return this.childrenService.getObservations(id, user);
  }

  @Post(':id/observations')
  @Roles('admin', 'teacher')
  createObservation(@Param('id') id: string, @Body() dto: CreateObservationDto, @CurrentUser() user: any) {
    return this.childrenService.createObservation(id, dto, user);
  }

  @Get(':id/portfolio')
  getPortfolio(@Param('id') id: string) { return this.childrenService.getPortfolio(id); }

  @Post(':id/portfolio')
  @Roles('admin', 'teacher')
  createPortfolioItem(@Param('id') id: string, @Body() dto: CreatePortfolioItemDto, @CurrentUser() user: any) {
    return this.childrenService.createPortfolioItem(id, dto, user);
  }

  @Get(':id/attendance')
  getAttendance(@Param('id') id: string) { return this.childrenService.getAttendance(id); }

  @Get(':id/payments')
  getPayments(@Param('id') id: string) { return this.childrenService.getPayments(id); }

  @Get(':id/notes')
  getNotes(@Param('id') id: string, @CurrentUser() user: any) { return this.childrenService.getNotes(id, user); }

  @Post(':id/notes')
  @Roles('psychologist', 'pediatrician')
  createNote(@Param('id') id: string, @Body() dto: CreateNoteDto, @CurrentUser() user: any) {
    return this.childrenService.createNote(id, dto, user);
  }

  @Get(':id/feed')
  getChildFeed(@Param('id') id: string) { return this.childrenService.getChildFeed(id); }

  @Get(':id/home-tasks')
  getHomeTasks(@Param('id') id: string) { return this.childrenService.getHomeTasks(id); }

  @Post(':id/home-tasks')
  @Roles('admin', 'teacher', 'psychologist', 'pediatrician')
  createHomeTask(@Param('id') id: string, @Body() dto: CreateHomeTaskDto, @CurrentUser() user: any) {
    return this.childrenService.createHomeTask(id, dto, user);
  }

  @Put(':id/home-tasks/:taskId')
  @Roles('admin', 'teacher', 'psychologist', 'pediatrician', 'parent')
  updateHomeTask(@Param('id') id: string, @Param('taskId') taskId: string, @Body() dto: UpdateHomeTaskDto) {
    return this.childrenService.updateHomeTask(id, taskId, dto);
  }

  @Delete(':id/home-tasks/:taskId')
  @Roles('admin', 'teacher', 'psychologist', 'pediatrician')
  deleteHomeTask(@Param('id') id: string, @Param('taskId') taskId: string) {
    return this.childrenService.deleteHomeTask(id, taskId);
  }
}
