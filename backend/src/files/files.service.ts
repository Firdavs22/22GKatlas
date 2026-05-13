import { Injectable, OnModuleInit, Logger, HttpException, HttpStatus } from '@nestjs/common';
import * as Minio from 'minio';
import * as crypto from 'crypto';

@Injectable()
export class FilesService implements OnModuleInit {
  private minioClient: Minio.Client;
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
        // No public policy — files served only through authenticated API endpoint
        this.logger.log(`Created private bucket: ${this.bucketName}`);
      }
    } catch (error) {
      this.logger.error(`Error initializing bucket: ${error.message}`);
    }
  }

  async uploadFile(file: any): Promise<string> {
    if (!file) throw new HttpException('File is required', HttpStatus.BAD_REQUEST);

    const ext = file.originalname.split('.').pop() || 'bin';
    const filename = `${crypto.randomUUID()}.${ext}`;

    try {
      await this.minioClient.putObject(
        this.bucketName,
        filename,
        file.buffer,
        file.size,
        { 'Content-Type': file.mimetype }
      );
      
      // Return public URL assuming API / Minio routing is available 
      // Nginx proxies /api/ to the backend, so we prefix with /api/
      return `/api/files/${filename}`;
    } catch (error) {
      this.logger.error(`Upload failed: ${error.message}`);
      throw new HttpException('File upload failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getFileStream(filename: string): Promise<any> {
    try {
      return await this.minioClient.getObject(this.bucketName, filename);
    } catch (error) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }
  }
}
