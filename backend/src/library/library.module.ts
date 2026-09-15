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
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Feature, FeatureGuard } from '../features/features.module';
import { DocumentDto } from './library.dto';
import { canEditLibrary, canReadDocument } from './library-access';
import { RevisionDto } from '../team/team.dto';

@Controller('library')
@Feature('library')
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
class LibraryController {
  constructor(private prisma: PrismaService) {}
  @Get() async list(@CurrentUser() user: { role: string }) {
    const allowed = [
      'all',
      ...(user.role !== 'parent' ? ['staff'] : []),
      ...(user.role === 'teacher' ? ['teachers'] : []),
      ...(user.role === 'parent' ? ['parents'] : []),
      ...(['psychologist', 'pediatrician'].includes(user.role)
        ? ['specialists']
        : []),
    ];
    return this.prisma.methodicalDocument.findMany({
      where: canEditLibrary(user.role)
        ? {}
        : { published: true, audience: { in: allowed } },
      orderBy: { updatedAt: 'desc' },
    });
  }
  @Get(':id') async get(
    @Param('id') id: string,
    @CurrentUser() user: { role: string },
  ) {
    const doc = await this.prisma.methodicalDocument.findUnique({
      where: { id },
    });
    if (!doc || !canReadDocument(doc, user.role)) throw new NotFoundException();
    return doc;
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
  @Roles('admin', 'superadmin', 'methodist')
  create(@Body() dto: DocumentDto, @CurrentUser() user: { id: string }) {
    return this.prisma.methodicalDocument.create({
      data: { ...this.data(dto), authorId: user.id },
    });
  }
  @Put(':id')
  @Roles('admin', 'superadmin', 'methodist')
  async update(@Param('id') id: string, @Body() dto: DocumentDto) {
    const result = await this.prisma.methodicalDocument.updateMany({
      where: { id, revision: dto.revision ?? -1 },
      data: { ...this.data(dto), revision: { increment: 1 } },
    });
    if (!result.count)
      throw new ConflictException('Материал уже изменен. Обновите список');
    return this.prisma.methodicalDocument.findUnique({ where: { id } });
  }
  @Delete(':id')
  @Roles('admin', 'superadmin', 'methodist')
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
