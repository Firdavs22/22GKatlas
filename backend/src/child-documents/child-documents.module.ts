import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Injectable, Module, NotFoundException, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ChildDocument } from '@prisma/client';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { FilesModule } from '../files/files.module';
import { FilesService } from '../files/files.service';
import { assertSafeMime } from '../files/files.controller';
import { PrismaService } from '../prisma/prisma.service';
import { isUtf8 } from 'node:buffer';

type Requester = { id: string; role: string };
const isAdministration = (role: string) => ['admin', 'director', 'superadmin'].includes(role);
const ALLOWED = ['application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png', 'image/webp'];

export class UploadChildDocumentDto {
  @IsOptional() @IsString() @MaxLength(200)
  title?: string;

  @IsOptional() @IsIn(['contract', 'medical', 'consent', 'other'])
  category?: string;
}

@Injectable()
export class ChildDocumentsService {
  constructor(private prisma: PrismaService, private files: FilesService) {}

  async assertAccess(childId: string, user: Requester) {
    if (!isAdministration(user.role)) {
      if (user.role !== 'parent' || !await this.prisma.childParent.findUnique({
        where: { childId_parentId: { childId, parentId: user.id } }, select: { childId: true },
      })) throw new ForbiddenException('Документы доступны администрации и родителям этого ребенка');
    }
    if (!await this.prisma.child.findUnique({ where: { id: childId }, select: { id: true } })) {
      throw new NotFoundException('Ребенок не найден');
    }
  }

  private present(doc: ChildDocument, user: Requester) {
    return { id: doc.id, title: doc.title, category: doc.category,
      filename: doc.filename, originalName: doc.originalName, size: doc.size,
      uploadedAt: doc.uploadedAt, canRemove: isAdministration(user.role) || doc.uploaderId === user.id };
  }

  async list(childId: string, user: Requester) {
    await this.assertAccess(childId, user);
    const docs = await this.prisma.childDocument.findMany({ where: { childId, deletedAt: null }, orderBy: { uploadedAt: 'desc' } });
    return docs.map(doc => this.present(doc, user));
  }

  async upload(childId: string, user: Requester, file: Express.Multer.File, dto: UploadChildDocumentDto) {
    await this.assertAccess(childId, user);
    if (!file?.buffer?.length) throw new BadRequestException('Выберите непустой файл');
    if (file.size > 20 * 1024 * 1024) throw new BadRequestException('Максимальный размер файла — 20 МБ');
    if (!ALLOWED.includes(file.mimetype)) throw new BadRequestException('Разрешены PDF, DOC, DOCX, XLSX, JPG, PNG, WEBP');
    await assertSafeMime(file);
    const result = await this.files.uploadFile(file, user.id, childId);
    // Each upload receives a fresh filename; clients cannot attach an existing
    // private file belonging to another child by submitting its URL.
    // Browsers send UTF-8 filenames, while multipart parsers may decode the
    // header as Latin-1. Keep already decoded names and repair valid UTF-8 only.
    const headerBytes = Buffer.from(file.originalname, 'latin1');
    const decodedName = /^[\u0000-\u00ff]*$/.test(file.originalname) && isUtf8(headerBytes)
      ? headerBytes.toString('utf8') : file.originalname;
    const originalName = decodedName.replace(/[\\/\u0000-\u001f\u007f]/g, '_').slice(0, 240);
    const doc = await this.prisma.childDocument.create({ data: {
      childId, uploaderId: user.id, filename: result.url.split('/').pop()!,
      title: dto.title?.trim() || originalName || 'Документ',
      category: dto.category || 'other', originalName, size: file.size,
    } });
    return this.present(doc, user);
  }

  async remove(childId: string, id: string, user: Requester) {
    await this.assertAccess(childId, user);
    const doc = await this.prisma.childDocument.findFirst({ where: { id, childId } });
    if (!doc) throw new NotFoundException('Документ не найден');
    if (!isAdministration(user.role) && doc.uploaderId !== user.id) {
      throw new ForbiddenException('Родитель может убрать только загруженные им документы');
    }
    await this.prisma.childDocument.updateMany({ where: { id, childId, deletedAt: null }, data: { deletedAt: new Date() } });
    return { ok: true };
  }
}

@Controller('children/:childId/documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'parent')
export class ChildDocumentsController {
  constructor(private documents: ChildDocumentsService) {}

  @Get()
  list(@Param('childId') childId: string, @CurrentUser() user: Requester) { return this.documents.list(childId, user); }

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024, files: 1, fields: 2 } }))
  upload(@Param('childId') childId: string, @CurrentUser() user: Requester,
    @UploadedFile() file: Express.Multer.File, @Body() dto: UploadChildDocumentDto) {
    return this.documents.upload(childId, user, file, dto);
  }

  @Delete(':id')
  remove(@Param('childId') childId: string, @Param('id') id: string, @CurrentUser() user: Requester) {
    return this.documents.remove(childId, id, user);
  }
}

@Module({ imports: [AuthModule, FilesModule], providers: [ChildDocumentsService], controllers: [ChildDocumentsController] })
export class ChildDocumentsModule {}
