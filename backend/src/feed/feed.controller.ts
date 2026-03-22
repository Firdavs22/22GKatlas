import { Controller, Get, Post, Delete, Body, Param, UseGuards, Res, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeedService } from './feed.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
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
  create(@Body() dto: any, @CurrentUser() user: any) { return this.feedService.createFeedItem(dto, user); }

  @Get('download/:childId')
  download(@Param('childId') childId: string, @Res() res: Response) {
    return this.feedService.downloadChildPhotos(childId, res);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: any) { return this.feedService.deleteFeedItem(id, user); }
}
