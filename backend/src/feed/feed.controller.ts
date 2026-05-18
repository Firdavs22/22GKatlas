import { Controller, Get, Post, Delete, Body, Param, UseGuards, Res, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeedService } from './feed.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateFeedItemDto } from './dto/feed.dto';
import type { Response } from 'express';

@Controller('feed')
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(private feedService: FeedService) {}

  @Get()
  getFeed(@CurrentUser() user: any, @Query('childId') childId?: string) {
    return this.feedService.getFeedForUser(user, childId);
  }

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 posts / min per IP
  create(@Body() dto: CreateFeedItemDto, @CurrentUser() user: any) {
    return this.feedService.createFeedItem(dto, user);
  }

  @Get('download/:childId')
  download(@Param('childId') childId: string, @CurrentUser() user: any, @Res() res: Response) {
    return this.feedService.downloadChildPhotos(childId, user, res);
  }

  @Post(':id/like')
  toggleLike(@Param('id') id: string, @CurrentUser() user: any) {
    return this.feedService.toggleLike(id, user.id);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: any) { return this.feedService.deleteFeedItem(id, user); }
}
