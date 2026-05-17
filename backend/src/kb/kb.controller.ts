import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { KbService } from './kb.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('kb')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KbController {
  constructor(private readonly kb: KbService) {}

  @Get('categories')
  listCategories() { return this.kb.listCategories(); }

  @Post('categories')
  @Roles('admin')
  createCategory(@Body() body: { title: string; description?: string; order?: number }) {
    return this.kb.createCategory(body);
  }

  @Put('categories/:id')
  @Roles('admin')
  updateCategory(@Param('id') id: string, @Body() body: { title?: string; description?: string; order?: number }) {
    return this.kb.updateCategory(id, body);
  }

  @Delete('categories/:id')
  @Roles('admin')
  deleteCategory(@Param('id') id: string) { return this.kb.deleteCategory(id); }

  @Get('articles')
  listArticles(@Query('categoryId') categoryId: string | undefined, @Request() req) {
    const onlyPublished = req.user.role === 'parent';
    return this.kb.listArticles({ categoryId, onlyPublished });
  }

  @Get('articles/:id')
  getArticle(@Param('id') id: string, @Request() req) {
    return this.kb.getArticle(id, req.user.role === 'parent');
  }

  @Post('articles')
  @Roles('admin')
  createArticle(@Request() req, @Body() body: {
    categoryId: string; title: string; excerpt?: string; body: string;
    videoUrl?: string; coverUrl?: string; published?: boolean;
  }) {
    return this.kb.createArticle(req.user.id, body);
  }

  @Put('articles/:id')
  @Roles('admin')
  updateArticle(@Param('id') id: string, @Body() body: {
    categoryId?: string; title?: string; excerpt?: string; body?: string;
    videoUrl?: string; coverUrl?: string; published?: boolean;
  }) {
    return this.kb.updateArticle(id, body);
  }

  @Delete('articles/:id')
  @Roles('admin')
  deleteArticle(@Param('id') id: string) { return this.kb.deleteArticle(id); }
}
