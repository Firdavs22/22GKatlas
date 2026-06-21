import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}

  // Любой авторизованный пользователь может отправить отзыв.
  // Если isAnonymous=true — authorId не сохраняется. POST /feedback исключён из
  // AuditInterceptor (см. SKIP_PATHS), чтобы userId не утёк в AuditLog.
  @Post()
  create(@CurrentUser() user: { id: string }, @Body() body: { message: string; isAnonymous?: boolean }) {
    return this.service.create(user.id, body.message, !!body.isAnonymous);
  }

  // Видит только superadmin. RolesGuard: admin не пройдёт, т.к. requiredRoles=['superadmin']
  // и в guard первый return true срабатывает только для самого superadmin'а.
  @Get()
  @Roles('superadmin')
  list(@Query('filter') filter?: string) {
    return this.service.list(filter === 'unread' ? 'unread' : 'all');
  }

  @Get('unread-count')
  @Roles('superadmin')
  unreadCount() {
    return this.service.unreadCount();
  }

  @Post(':id/read')
  @Roles('superadmin')
  markRead(@Param('id') id: string) {
    return this.service.markRead(id);
  }
}
