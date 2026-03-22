import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatsService } from './chats.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatsController {
  constructor(private chatsService: ChatsService) {}

  @Get()
  getChats(@CurrentUser() user: any) { return this.chatsService.getChatsForUser(user.id); }

  @Get(':id/messages')
  getMessages(@Param('id') id: string, @CurrentUser() user: any) {
    return this.chatsService.getMessages(id, user.id);
  }

  @Post(':id/messages')
  sendMessage(@Param('id') id: string, @Body() dto: { text: string; attachments?: string[] }, @CurrentUser() user: any) {
    return this.chatsService.sendMessage(id, dto, user.id);
  }
}
