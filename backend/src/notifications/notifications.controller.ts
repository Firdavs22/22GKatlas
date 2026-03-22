import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  get(@CurrentUser() user: any) { return this.notificationsService.getNotifications(user.id); }

  @Post('read-all')
  readAll(@CurrentUser() user: any) { return this.notificationsService.readAll(user.id); }
}
