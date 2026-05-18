import { Controller, Post, Get, Param, Query, Req, UseInterceptors, UploadedFile, UploadedFiles, Res, UseGuards, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FilesService } from './files.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { fromBuffer as detectFromBuffer } from 'file-type';
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

/**
 * Detect MIME by magic bytes (file content) and ensure it matches whitelist.
 * Client-supplied Content-Type is unreliable — a `.jpg` extension can hide an
 * executable. This refuses the upload if the actual bytes aren't an allowed type.
 *
 * SVG is a text format with no magic bytes and is allowed-by-client-mime
 * only (still safe because we serve via authenticated proxy, not raw).
 */
async function assertSafeMime(file: Express.Multer.File): Promise<void> {
  // SVG and tiny text files won't be detected by magic bytes — fall back
  // to client-supplied mime which we already whitelisted.
  if (file.mimetype === 'image/svg+xml') return;

  const detected = await detectFromBuffer(file.buffer);
  if (!detected) {
    throw new BadRequestException(
      `Не удалось определить тип файла «${file.originalname}». Возможно, файл повреждён.`,
    );
  }
  if (!ALLOWED_MIMETYPES.includes(detected.mime)) {
    throw new BadRequestException(
      `Содержимое файла «${file.originalname}» (${detected.mime}) не разрешено к загрузке.`,
    );
  }
  if (detected.mime !== file.mimetype) {
    throw new BadRequestException(
      `Файл «${file.originalname}» помечен как ${file.mimetype}, но фактически ${detected.mime}.`,
    );
  }
}

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
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 uploads / min per IP
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: { id: string }) {
    if (!file) throw new BadRequestException('Файл не загружен');
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Недопустимый тип файла: ${file.mimetype}. Разрешены: изображения, видео, PDF, документы.`,
      );
    }
    await assertSafeMime(file);
    return this.filesService.uploadFile(file, user?.id);
  }

  /** Batch upload — accepts up to 20 files in one multipart request. */
  @Post('upload/batch')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 batches / min per IP
  @UseInterceptors(
    FilesInterceptor('files', 20, { limits: { fileSize: MAX_FILE_SIZE } }),
  )
  async uploadBatch(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: { id: string },
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Файлы не загружены');
    }
    for (const f of files) {
      if (!ALLOWED_MIMETYPES.includes(f.mimetype)) {
        throw new BadRequestException(
          `Недопустимый тип файла «${f.originalname}»: ${f.mimetype}.`,
        );
      }
      await assertSafeMime(f);
    }
    const results = await this.filesService.uploadFiles(files, user?.id);
    return { files: results };
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

    let payload: { sub?: string; role?: string };
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Недействительный токен');
    }

    if (payload.sub && payload.role) {
      await this.filesService.assertCanRead(filename, { id: payload.sub, role: payload.role });
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
