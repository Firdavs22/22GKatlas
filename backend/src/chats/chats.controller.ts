import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatsService } from './chats.service';
import { ChatsGateway } from './chats.gateway';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatsController {
  constructor(
    private chatsService: ChatsService,
    private chatsGateway: ChatsGateway,
  ) {}

  @Get()
  getChats(@CurrentUser() user: any) { return this.chatsService.getChatsForUser(user.id); }

  @Get('staff')
  getAvailableStaff(@CurrentUser() user: any) { return this.chatsService.getAvailableStaff(user.id); }

  @Post()
  createChat(@Body() dto: { targetUserId: string; type: string }, @CurrentUser() user: any) {
    return this.chatsService.createOrGetChat(dto.targetUserId, dto.type, user.id);
  }

  @Get(':id/messages')
  getMessages(@Param('id') id: string, @CurrentUser() user: any) {
    return this.chatsService.getMessages(id, user.id);
  }

  @Post(':id/messages')
  async sendMessage(@Param('id') id: string, @Body() dto: { text: string; attachments?: string[] }, @CurrentUser() user: any) {
    const message = await this.chatsService.sendMessage(id, dto, user.id);
    this.chatsGateway.notifyNewMessage(id, message);
    return message;
  }
}
