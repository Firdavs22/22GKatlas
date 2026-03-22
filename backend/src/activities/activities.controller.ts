import { Controller, Get, Post, Body, UseGuards, Request, Delete, Param } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('activities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  // ===================== MENUS =====================
  @Get('menu')
  @Roles('admin', 'teacher', 'parent', 'pediatrician')
  async getMenus() {
    return this.activitiesService.getMenus();
  }

  @Post('menu')
  @Roles('admin', 'pediatrician')
  async createMenu(@Request() req, @Body() body: any) {
    const userId = req.user.id;
    return this.activitiesService.createMenu(userId, body);
  }

  @Delete('menu/:id')
  @Roles('admin', 'pediatrician')
  async deleteMenu(@Param('id') id: string) {
    return this.activitiesService.deleteMenu(id);
  }

  // ===================== EVENTS =====================
  @Get('events')
  @Roles('admin', 'teacher', 'parent', 'pediatrician')
  async getEvents() {
    return this.activitiesService.getEvents();
  }

  @Post('events')
  @Roles('admin')
  async createEvent(@Request() req, @Body() body: any) {
    const userId = req.user.id;
    return this.activitiesService.createEvent(userId, body);
  }

  @Delete('events/:id')
  @Roles('admin')
  async deleteEvent(@Param('id') id: string) {
    return this.activitiesService.deleteEvent(id);
  }

  // ===================== BROADCASTS =====================
  @Get('broadcasts')
  @Roles('admin')
  async getBroadcasts() {
    return this.activitiesService.getBroadcasts();
  }

  @Post('broadcasts')
  @Roles('admin')
  async createBroadcast(@Request() req, @Body() body: any) {
    const userId = req.user.id;
    return this.activitiesService.createBroadcast(userId, body);
  }
}
