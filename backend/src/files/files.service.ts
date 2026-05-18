import { Injectable, OnModuleInit, Logger, HttpException, HttpStatus, ForbiddenException } from '@nestjs/common';
import * as Minio from 'minio';
import * as crypto from 'crypto';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';

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

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // S3-compatible client — works against either MinIO or SeaweedFS S3.
    // Region must be set for SeaweedFS signature validation.
    this.minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: Number(process.env.MINIO_PORT) || 8333,
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      region: process.env.S3_REGION || 'us-east-1',
      pathStyle: true,
    } as Minio.ClientOptions);
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

  async uploadFile(file: Express.Multer.File, uploaderId?: string): Promise<UploadResult> {
    if (!file) throw new HttpException('File is required', HttpStatus.BAD_REQUEST);

    const isImage = IMAGE_MIMETYPES.has(file.mimetype);
    const baseId = crypto.randomUUID();

    try {
      const result = isImage
        ? await this.uploadImage(baseId, file)
        : await this.uploadRaw(baseId, file);

      // Track uploader for downstream access control.
      if (uploaderId) {
        const filenames = [result.url, result.previewUrl]
          .filter((u): u is string => Boolean(u))
          .map(u => u.split('/').pop()!)
          .filter(Boolean);
        await Promise.all(
          filenames.map(filename =>
            this.prisma.fileMeta.upsert({
              where: { filename },
              update: {},
              create: { filename, scope: 'uploader', uploaderId },
            }),
          ),
        );
      }
      return result;
    } catch (error) {
      this.logger.error(`Upload failed: ${(error as Error).message}`);
      throw new HttpException('File upload failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /** Bulk upload — runs in parallel, returns one result per file in input order. */
  async uploadFiles(files: Express.Multer.File[], uploaderId?: string): Promise<UploadResult[]> {
    if (!files || files.length === 0) {
      throw new HttpException('Файлы не загружены', HttpStatus.BAD_REQUEST);
    }
    return Promise.all(files.map(f => this.uploadFile(f, uploaderId)));
  }

  /**
   * Authorize file read. Throws ForbiddenException if the requester may not view this file.
   * Rules:
   *   • Legacy files (no FileMeta) — always allowed (current behavior).
   *   • Uploader can always read their own files.
   *   • Admin can read any file.
   *   • Files uploaded by staff (admin/teacher/specialists) — readable by any authenticated user
   *     (URLs only leak through accessible posts).
   *   • Files uploaded by a parent — readable by uploader + admin + staff with a child of theirs.
   */
  async assertCanRead(filename: string, requester: { id: string; role: string }): Promise<void> {
    const meta = await this.prisma.fileMeta.findUnique({ where: { filename } });
    if (!meta) return; // legacy file — fall through to permissive
    if (meta.scope === 'public') return;
    if (requester.role === 'admin') return;
    if (meta.uploaderId === requester.id) return;

    if (!meta.uploaderId) return; // anonymous-origin file — permissive

    const uploader = await this.prisma.user.findUnique({
      where: { id: meta.uploaderId },
      select: { role: true, id: true },
    });
    if (!uploader) return; // uploader gone — fall through

    if (uploader.role !== 'parent') {
      // Staff uploads are visible to all authenticated users by design.
      return;
    }

    // Parent-uploaded: check if requester is staff connected to one of the uploader's children.
    if (
      requester.role === 'teacher' ||
      requester.role === 'psychologist' ||
      requester.role === 'pediatrician'
    ) {
      const parentChildren = await this.prisma.childParent.findMany({
        where: { parentId: uploader.id },
        select: { childId: true },
      });
      const childIds = parentChildren.map(c => c.childId);
      if (childIds.length === 0) {
        throw new ForbiddenException('Нет доступа к файлу');
      }
      if (requester.role === 'teacher') {
        const ok = await this.prisma.child.count({
          where: { id: { in: childIds }, group: { teacherId: requester.id } },
        });
        if (ok > 0) return;
      } else {
        const ok = await this.prisma.childSpecialist.count({
          where: { specialistId: requester.id, childId: { in: childIds } },
        });
        if (ok > 0) return;
      }
    }

    throw new ForbiddenException('Нет доступа к файлу');
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
