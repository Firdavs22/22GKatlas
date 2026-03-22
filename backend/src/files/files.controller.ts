import { Controller, Post, Get, Param, UseInterceptors, UploadedFile, Res, UseGuards } from '@nestjs/common';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Response } from 'express';

@Controller()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: any) {
    const url = await this.filesService.uploadFile(file);
    return { url };
  }

  // Proxy endpoint to read files from MinIO avoiding direct 9000 port exposure
  @Get('files/:filename')
  async getFile(@Param('filename') filename: string, @Res() res: Response) {
    const stream = await this.filesService.getFileStream(filename);
    
    // Attempt basic content type inferrence (optional, stream pipe will handle data)
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'png') res.setHeader('Content-Type', 'image/png');
    else if (ext === 'jpg' || ext === 'jpeg') res.setHeader('Content-Type', 'image/jpeg');
    else if (ext === 'pdf') res.setHeader('Content-Type', 'application/pdf');
    else if (ext === 'mp4') res.setHeader('Content-Type', 'video/mp4');

    stream.pipe(res);
  }
}
