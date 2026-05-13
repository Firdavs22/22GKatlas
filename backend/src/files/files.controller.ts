import { Controller, Post, Get, Param, Query, Req, UseInterceptors, UploadedFile, Res, UseGuards, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_MIMETYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

@Controller()
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  async uploadFile(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Файл не загружен');
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Недопустимый тип файла: ${file.mimetype}. Разрешены: изображения, видео, PDF, документы.`,
      );
    }
    const url = await this.filesService.uploadFile(file);
    return { url };
  }

  // Proxy endpoint to read files from MinIO
  // Supports auth via Authorization header OR ?token= query parameter
  // (browsers can't send Authorization headers in <img src> / <video src>)
  @Get('files/:filename')
  async getFile(
    @Param('filename') filename: string,
    @Query('token') queryToken: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Verify JWT from header or query string
    const headerToken = (req.headers.authorization || '').replace('Bearer ', '');
    const token = headerToken || queryToken;

    if (!token) {
      throw new UnauthorizedException('Требуется авторизация');
    }

    try {
      this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Недействительный токен');
    }

    const stream = await this.filesService.getFileStream(filename);

    // Set Content-Type based on file extension
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    // Allow browser caching for authenticated media (1 hour)
    res.setHeader('Cache-Control', 'private, max-age=3600');

    stream.pipe(res);
  }
}
