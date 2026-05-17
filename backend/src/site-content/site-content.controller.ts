import {
  Body, Controller, Get, Param, Put, Res, UseGuards, NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { SiteContentService } from './site-content.service';
import { FilesService } from '../files/files.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml',
};

@Controller('site-content')
export class SiteContentController {
  constructor(
    private readonly svc: SiteContentService,
    private readonly files: FilesService,
  ) {}

  // Public — login screen and About page need this without auth.
  @Get()
  getAll() { return this.svc.getAll(); }

  // Public streaming of the login logo (no JWT, since the screen is pre-login).
  @Get('public/logo')
  async getLogo(@Res() res: Response) {
    const login = (await this.svc.getOne('login')) as { logoUrl?: string } | null;
    await this.streamFromUrl(login?.logoUrl, res, 'Логотип не задан');
  }

  // Public sidebar icon (sidebar shows after login but auth check via JWT in <img>
  // is awkward — keeping this public is fine since it's just a brand asset).
  @Get('public/sidebar-icon')
  async getSidebarIcon(@Res() res: Response) {
    const sidebar = (await this.svc.getOne('sidebar')) as { iconUrl?: string } | null;
    await this.streamFromUrl(sidebar?.iconUrl, res, 'Иконка не задана');
  }

  private async streamFromUrl(url: string | undefined, res: Response, missingMsg: string) {
    const m = /\/files\/([^/?#]+)/.exec(url || '');
    if (!m) throw new NotFoundException(missingMsg);
    const filename = m[1];
    const stream = await this.files.getFileStream(filename);
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    res.setHeader('Content-Type', CONTENT_TYPES[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=300');
    stream.pipe(res);
  }

  @Get(':key')
  getOne(@Param('key') key: string) { return this.svc.getOne(key); }

  @Put(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  upsert(@Param('key') key: string, @Body() body: { value: unknown }) {
    return this.svc.upsert(key, body.value);
  }
}
