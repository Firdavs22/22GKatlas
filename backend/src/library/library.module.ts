import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Module,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Feature, FeatureGuard } from '../features/features.module';
import { DocumentDto, ReviewDocumentDto } from './library.dto';
import { canEditLibrary, canReadDocument } from './library-access';
import { RevisionDto } from '../team/team.dto';

@Controller('library')
@Feature('library')
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
class LibraryController {
  constructor(private prisma: PrismaService) {}
  @Get() async list(@CurrentUser() user: { id: string; role: string }) {
    const allowed = [
      'all',
      ...(user.role !== 'parent' ? ['staff'] : []),
      ...(user.role === 'teacher' ? ['teachers'] : []),
      ...(user.role === 'parent' ? ['parents'] : []),
      ...(['psychologist', 'pediatrician'].includes(user.role)
        ? ['specialists']
        : []),
    ];
    const docs = await this.prisma.methodicalDocument.findMany({
      where: canEditLibrary(user.role)
        ? {}
        : {
            OR: [
              {
                published: true,
                reviewStatus: 'approved',
                audience: { in: allowed },
              },
              ...(user.role === 'teacher' ? [{ authorId: user.id }] : []),
            ],
          },
      orderBy: { updatedAt: 'desc' },
    });
    const authors = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(docs.map((doc) => doc.authorId))] } },
      select: { id: true, name: true },
    });
    return docs.map((doc) => ({
      ...doc,
      reviewComment:
        canEditLibrary(user.role) || doc.authorId === user.id
          ? doc.reviewComment
          : '',
      authorName:
        authors.find((author) => author.id === doc.authorId)?.name || 'Автор',
    }));
  }
  @Get(':id') async get(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const doc = await this.prisma.methodicalDocument.findUnique({
      where: { id },
    });
    if (!doc || !canReadDocument(doc, user.role, user.id))
      throw new NotFoundException();
    return {
      ...doc,
      reviewComment:
        canEditLibrary(user.role) || doc.authorId === user.id
          ? doc.reviewComment
          : '',
    };
  }
  private data(dto: DocumentDto) {
    if (
      !dto.title.trim() ||
      (!dto.body.trim() && !dto.attachments.length && !dto.links.length)
    )
      throw new BadRequestException('Добавьте название и содержимое материала');
    if (
      dto.attachments.some(
        (url) => !/^\/api\/files\/[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(url),
      )
    )
      throw new BadRequestException('Вложения должны быть загружены в портал');
    const { revision, ...data } = dto;
    return { ...data, title: data.title.trim() };
  }
  @Post()
  @Roles('director', 'superadmin', 'methodist')
  create(@Body() dto: DocumentDto, @CurrentUser() user: { id: string }) {
    return this.prisma.methodicalDocument.create({
      data: { ...this.data(dto), authorId: user.id },
    });
  }

  @Post('proposals')
  @Roles('teacher')
  async propose(@Body() dto: DocumentDto, @CurrentUser() user: { id: string }) {
    const data = this.data(dto);
    return this.prisma.$transaction(async (tx) => {
      const doc = await tx.methodicalDocument.create({
        data: {
          ...data,
          authorId: user.id,
          published: false,
          reviewStatus: 'pending',
        },
      });
      await this.notifyReviewers(tx, doc.id);
      return doc;
    });
  }

  @Post(':id/resubmit')
  @Roles('teacher')
  async resubmit(
    @Param('id') id: string,
    @Body() dto: DocumentDto,
    @CurrentUser() user: { id: string },
  ) {
    const data = this.data(dto);
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.methodicalDocument.updateMany({
        where: {
          id,
          authorId: user.id,
          reviewStatus: 'returned',
          revision: dto.revision ?? -1,
        },
        data: {
          ...data,
          published: false,
          reviewStatus: 'pending',
          reviewComment: '',
          reviewedById: null,
          reviewedAt: null,
          revision: { increment: 1 },
        },
      });
      if (!result.count)
        throw new ConflictException(
          'Можно повторно отправить только свое предложение, возвращенное на доработку. Обновите список.',
        );
      await this.notifyReviewers(tx, id);
      return tx.methodicalDocument.findUniqueOrThrow({ where: { id } });
    });
  }

  private async notifyReviewers(
    tx: import('@prisma/client').Prisma.TransactionClient,
    id: string,
  ) {
    const reviewers = await tx.user.findMany({
      where: {
        role: { in: ['methodist', 'director', 'superadmin'] },
        deletedAt: null,
        blockedAt: null,
      },
      select: { id: true },
    });
    if (reviewers.length)
      await tx.notification.createMany({
        data: reviewers.map((reviewer) => ({
          userId: reviewer.id,
          type: 'library_review',
          title: 'Материал на проверку',
          body: 'Педагог предложил материал. Откройте вкладку «На проверке» в библиотеке.',
          data: { url: '/library', documentId: id },
        })),
      });
  }

  @Post(':id/review')
  @Roles('director', 'superadmin', 'methodist')
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewDocumentDto,
    @CurrentUser() user: { id: string },
  ) {
    if (dto.decision === 'return' && !dto.comment.trim())
      throw new BadRequestException('Напишите, что нужно доработать');
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.methodicalDocument.updateMany({
        where: { id, reviewStatus: 'pending', revision: dto.revision },
        data: {
          reviewStatus: dto.decision === 'approve' ? 'approved' : 'returned',
          published: dto.decision === 'approve',
          audience: dto.audience,
          reviewComment: dto.comment.trim(),
          reviewedById: user.id,
          reviewedAt: new Date(),
          revision: { increment: 1 },
        },
      });
      if (!result.count)
        throw new ConflictException(
          'Предложение уже рассмотрено или изменено. Обновите список.',
        );
      const doc = await tx.methodicalDocument.findUniqueOrThrow({
        where: { id },
      });
      const author = await tx.user.findFirst({
        where: { id: doc.authorId, deletedAt: null, blockedAt: null },
        select: { id: true },
      });
      if (author)
        await tx.notification.create({
          data: {
            userId: author.id,
            type: 'library_review',
            title:
              dto.decision === 'approve'
                ? 'Ваш материал опубликован'
                : 'Материал требует доработки',
            body: 'Результат проверки доступен в разделе «Правила и материалы», вкладка «Мои предложения».',
            data: { url: '/library', documentId: id },
          },
        });
      return doc;
    });
  }
  @Put(':id')
  @Roles('director', 'superadmin', 'methodist')
  async update(@Param('id') id: string, @Body() dto: DocumentDto) {
    const result = await this.prisma.methodicalDocument.updateMany({
      where: { id, revision: dto.revision ?? -1, reviewStatus: 'approved' },
      data: { ...this.data(dto), revision: { increment: 1 } },
    });
    if (!result.count)
      throw new ConflictException('Материал уже изменен. Обновите список');
    return this.prisma.methodicalDocument.findUnique({ where: { id } });
  }
  @Delete(':id')
  @Roles('director', 'superadmin', 'methodist')
  async remove(@Param('id') id: string, @Body() dto: RevisionDto) {
    const result = await this.prisma.methodicalDocument.deleteMany({
      where: { id, revision: dto.revision },
    });
    if (!result.count) throw new ConflictException('Материал уже изменен');
    return { ok: true };
  }
}
@Module({ controllers: [LibraryController] })
export class LibraryModule {}
