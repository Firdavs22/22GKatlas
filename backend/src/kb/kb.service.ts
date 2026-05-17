import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яё\s-]/giu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60) || `kb-${Date.now().toString(36)}`;
}

@Injectable()
export class KbService {
  constructor(private prisma: PrismaService) {}

  listCategories() {
    return this.prisma.kbCategory.findMany({
      orderBy: [{ order: 'asc' }, { title: 'asc' }],
      include: { _count: { select: { articles: { where: { published: true } } } } },
    });
  }

  async createCategory(dto: { title?: string; description?: string; order?: number }) {
    const title = (dto.title || '').trim();
    if (!title) throw new BadRequestException('Укажите название раздела');
    const slug = await this.uniqueSlug(slugify(title));
    return this.prisma.kbCategory.create({
      data: {
        title,
        slug,
        description: dto.description?.trim() || null,
        order: typeof dto.order === 'number' ? dto.order : 0,
      },
    });
  }

  async updateCategory(id: string, dto: { title?: string; description?: string; order?: number }) {
    const data: { title?: string; description?: string | null; order?: number; slug?: string } = {};
    if (dto.title !== undefined) {
      const title = dto.title.trim();
      if (!title) throw new BadRequestException('Название не может быть пустым');
      data.title = title;
      data.slug = await this.uniqueSlug(slugify(title), id);
    }
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.order !== undefined) data.order = dto.order;
    return this.prisma.kbCategory.update({ where: { id }, data });
  }

  async deleteCategory(id: string) {
    const count = await this.prisma.kbArticle.count({ where: { categoryId: id } });
    if (count > 0) {
      throw new BadRequestException('Сначала удалите или перенесите статьи раздела');
    }
    return this.prisma.kbCategory.delete({ where: { id } });
  }

  listArticles(opts: { categoryId?: string; onlyPublished?: boolean }) {
    return this.prisma.kbArticle.findMany({
      where: {
        ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
        ...(opts.onlyPublished ? { published: true } : {}),
      },
      include: { category: { select: { id: true, title: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getArticle(id: string, onlyPublished = false) {
    const article = await this.prisma.kbArticle.findUnique({
      where: { id },
      include: { category: { select: { id: true, title: true, slug: true } } },
    });
    if (!article) throw new NotFoundException();
    if (onlyPublished && !article.published) throw new NotFoundException();
    return article;
  }

  async createArticle(authorId: string, dto: {
    categoryId?: string;
    title?: string;
    excerpt?: string;
    body?: string;
    videoUrl?: string;
    coverUrl?: string;
    published?: boolean;
  }) {
    const title = (dto.title || '').trim();
    const body = (dto.body || '').trim();
    if (!dto.categoryId) throw new BadRequestException('Укажите раздел');
    if (!title || !body) throw new BadRequestException('Укажите заголовок и текст');
    return this.prisma.kbArticle.create({
      data: {
        categoryId: dto.categoryId,
        title,
        excerpt: dto.excerpt?.trim() || null,
        body,
        videoUrl: dto.videoUrl?.trim() || null,
        coverUrl: dto.coverUrl?.trim() || null,
        published: dto.published ?? true,
        authorId,
      },
      include: { category: { select: { id: true, title: true, slug: true } } },
    });
  }

  async updateArticle(id: string, dto: {
    categoryId?: string;
    title?: string;
    excerpt?: string;
    body?: string;
    videoUrl?: string;
    coverUrl?: string;
    published?: boolean;
  }) {
    const data: Record<string, unknown> = {};
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.excerpt !== undefined) data.excerpt = dto.excerpt?.trim() || null;
    if (dto.body !== undefined) data.body = dto.body.trim();
    if (dto.videoUrl !== undefined) data.videoUrl = dto.videoUrl?.trim() || null;
    if (dto.coverUrl !== undefined) data.coverUrl = dto.coverUrl?.trim() || null;
    if (dto.published !== undefined) data.published = !!dto.published;
    return this.prisma.kbArticle.update({
      where: { id },
      data,
      include: { category: { select: { id: true, title: true, slug: true } } },
    });
  }

  deleteArticle(id: string) {
    return this.prisma.kbArticle.delete({ where: { id } });
  }

  private async uniqueSlug(base: string, ignoreId?: string): Promise<string> {
    let slug = base;
    let i = 1;
    while (true) {
      const existing = await this.prisma.kbCategory.findUnique({ where: { slug } });
      if (!existing || existing.id === ignoreId) return slug;
      i += 1;
      slug = `${base}-${i}`;
    }
  }
}
