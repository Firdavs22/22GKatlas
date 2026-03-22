import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChildrenService } from './children.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('children')
@UseGuards(JwtAuthGuard)
export class ChildrenController {
  constructor(private childrenService: ChildrenService) {}

  @Get()
  getChildren(@CurrentUser() user: any) { return this.childrenService.getChildrenForUser(user); }

  @Get(':id')
  getChild(@Param('id') id: string, @CurrentUser() user: any) { return this.childrenService.getChildProfile(id, user); }

  @Get(':id/progress')
  getProgress(@Param('id') id: string) { return this.childrenService.getProgress(id); }

  @Get(':id/progress-history')
  getProgressHistory(@Param('id') id: string) { return this.childrenService.getProgressHistory(id); }

  @Put(':id/progress')
  updateProgress(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.childrenService.updateProgress(id, dto, user);
  }

  @Get(':id/observations')
  getObservations(@Param('id') id: string, @CurrentUser() user: any) {
    return this.childrenService.getObservations(id, user);
  }

  @Post(':id/observations')
  createObservation(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.childrenService.createObservation(id, dto, user);
  }

  @Get(':id/portfolio')
  getPortfolio(@Param('id') id: string) { return this.childrenService.getPortfolio(id); }

  @Post(':id/portfolio')
  createPortfolioItem(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.childrenService.createPortfolioItem(id, dto, user);
  }

  @Get(':id/attendance')
  getAttendance(@Param('id') id: string) { return this.childrenService.getAttendance(id); }

  @Get(':id/payments')
  getPayments(@Param('id') id: string) { return this.childrenService.getPayments(id); }

  @Get(':id/notes')
  getNotes(@Param('id') id: string, @CurrentUser() user: any) { return this.childrenService.getNotes(id, user); }

  @Post(':id/notes')
  createNote(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.childrenService.createNote(id, dto, user);
  }

  @Get(':id/feed')
  getChildFeed(@Param('id') id: string) { return this.childrenService.getChildFeed(id); }

  @Get(':id/home-tasks')
  getHomeTasks(@Param('id') id: string) { return this.childrenService.getHomeTasks(id); }

  @Post(':id/home-tasks')
  createHomeTask(@Param('id') id: string, @Body() dto: any) {
    return this.childrenService.createHomeTask(id, dto);
  }

  @Put(':id/home-tasks/:taskId')
  updateHomeTask(@Param('taskId') taskId: string, @Body() dto: any) {
    return this.childrenService.updateHomeTask(taskId, dto);
  }

  @Delete(':id/home-tasks/:taskId')
  deleteHomeTask(@Param('taskId') taskId: string) {
    return this.childrenService.deleteHomeTask(taskId);
  }
}
