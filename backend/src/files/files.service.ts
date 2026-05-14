import { Injectable, OnModuleInit, Logger, HttpException, HttpStatus } from '@nestjs/common';
import * as Minio from 'minio';
import * as crypto from 'crypto';
import sharp from 'sharp';

const IMAGE_MIMETYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
]);

/** Max long-edge dimensions for full and preview variants. */
const FULL_MAX = 2000;
const PREVIEW_MAX = 400;

export interface UploadResult {
  /** Internal proxied URL (served via authenticated GET /files/:filename). */
  url: string;
  /** Lightweight preview URL — only present for images. Use in thumbnails / grids. */
  previewUrl?: string;
}

@Injectable()
export class FilesService implements OnModuleInit {
  private minioClient!: Minio.Client;
  private readonly logger = new Logger(FilesService.name);
  private bucketName = 'globoatlas-files';

  async onModuleInit() {
    this.minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: Number(process.env.MINIO_PORT) || 9000,
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });
    await this.initBucket();
  }

  private async initBucket() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Created private bucket: ${this.bucketName}`);
      }
    } catch (error) {
      this.logger.error(`Error initializing bucket: ${(error as Error).message}`);
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<UploadResult> {
    if (!file) throw new HttpException('File is required', HttpStatus.BAD_REQUEST);

    const isImage = IMAGE_MIMETYPES.has(file.mimetype);
    const baseId = crypto.randomUUID();

    try {
      if (isImage) {
        return await this.uploadImage(baseId, file);
      }
      return await this.uploadRaw(baseId, file);
    } catch (error) {
      this.logger.error(`Upload failed: ${(error as Error).message}`);
      throw new HttpException('File upload failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /** Bulk upload — runs in parallel, returns one result per file in input order. */
  async uploadFiles(files: Express.Multer.File[]): Promise<UploadResult[]> {
    if (!files || files.length === 0) {
      throw new HttpException('Файлы не загружены', HttpStatus.BAD_REQUEST);
    }
    // Parallel — sharp + minio releases the event loop fine here.
    return Promise.all(files.map(f => this.uploadFile(f)));
  }

  /** Strips EXIF, resizes if too large, generates a 400px preview. */
  private async uploadImage(baseId: string, file: Express.Multer.File): Promise<UploadResult> {
    // Preserve GIF as-is (sharp handles it but loses animation by default).
    if (file.mimetype === 'image/gif') {
      const filename = `${baseId}.gif`;
      await this.putObject(filename, file.buffer, 'image/gif');
      // For preview, take first frame
      const previewBuf = await sharp(file.buffer, { animated: false })
        .resize({ width: PREVIEW_MAX, withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
      const previewName = `${baseId}_preview.jpg`;
      await this.putObject(previewName, previewBuf, 'image/jpeg');
      return {
        url: `/api/files/${filename}`,
        previewUrl: `/api/files/${previewName}`,
      };
    }

    // Re-encode every other image as JPEG: strips EXIF, lossy compression, predictable size.
    // Note: PNGs lose transparency — acceptable trade-off for photo-heavy app.
    // If transparency matters in some flow, special-case it here.
    const baseSharp = sharp(file.buffer, { failOn: 'none' }).rotate(); // honors orientation EXIF before stripping

    const [fullBuf, previewBuf] = await Promise.all([
      baseSharp
        .clone()
        .resize({ width: FULL_MAX, height: FULL_MAX, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer(),
      baseSharp
        .clone()
        .resize({ width: PREVIEW_MAX, height: PREVIEW_MAX, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 78, mozjpeg: true })
        .toBuffer(),
    ]);

    const fullName = `${baseId}.jpg`;
    const previewName = `${baseId}_preview.jpg`;

    await Promise.all([
      this.putObject(fullName, fullBuf, 'image/jpeg'),
      this.putObject(previewName, previewBuf, 'image/jpeg'),
    ]);

    return {
      url: `/api/files/${fullName}`,
      previewUrl: `/api/files/${previewName}`,
    };
  }

  /** Video / pdf / docs go straight to MinIO unchanged. */
  private async uploadRaw(baseId: string, file: Express.Multer.File): Promise<UploadResult> {
    const ext = (file.originalname.split('.').pop() || 'bin').toLowerCase().slice(0, 8);
    const filename = `${baseId}.${ext}`;
    await this.putObject(filename, file.buffer, file.mimetype);
    return { url: `/api/files/${filename}` };
  }

  private async putObject(filename: string, buffer: Buffer, contentType: string) {
    await this.minioClient.putObject(this.bucketName, filename, buffer, buffer.length, {
      'Content-Type': contentType,
    });
  }

  async getFileStream(filename: string) {
    try {
      return await this.minioClient.getObject(this.bucketName, filename);
    } catch {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }
  }
}
