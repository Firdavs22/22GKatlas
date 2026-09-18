import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../common/access-control.service';
import { canReadDocument } from '../library/library-access';
import { enabledFeatures } from '../features/features.module';

export type FileRequester = { id: string; role: string };
type Reference = { kind: string; data: Record<string, any> };

/** Extract internal file references, including URLs embedded in rich text. */
export function referencedFiles(value: unknown): string[] {
  const result = new Set<string>();
  const visit = (item: unknown) => {
    if (typeof item === 'string') {
      for (const match of item.matchAll(/\/(?:api\/)?files\/([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)(?=[?#\s"'<>]|$)/g)) result.add(match[1]);
    } else if (Array.isArray(item)) item.forEach(visit);
    else if (item && typeof item === 'object') Object.values(item).forEach(visit);
  };
  visit(value);
  return [...result];
}

@Injectable()
export class FileAccessService {
  constructor(private prisma: PrismaService, private access: AccessControlService) {}

  async assertCanRead(filename: string, user: FileRequester): Promise<void> {
    if (!/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(filename)) throw new ForbiddenException('Нет доступа к файлу');
    if (['superadmin', 'director'].includes(user.role)) return;
    const meta = await this.prisma.fileMeta.findUnique({ where: { filename } });

    // Resolve the current owning records rather than caching an uploader's role.
    // This also supports old absolute URLs and legacy files without FileMeta.
    // Preview images inherit the permissions of the original image.
    const stem = filename.replace(/_preview\.jpg$/i, '').replace(/\.(jpg|jpeg|png|webp|gif)$/i, '');
    const image = /\.(jpg|jpeg|png|webp|gif)$/i.test(filename);
    const escaped = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const name = image ? `${escaped(stem)}(_preview\\.jpg|\\.(jpg|jpeg|png|webp|gif))` : escaped(filename);
    const pattern = `/(api/)?files/${name}([?\u0023"'[:space:]<>\\\\]|$)`;
    const references = await this.prisma.$queryRaw<Reference[]>`
      SELECT kind, data FROM (
        SELECT 'child' AS kind, jsonb_build_object('id', id, 'url', photo) AS data FROM "Child"
        UNION ALL SELECT 'child-document', jsonb_build_object('childId', "childId", 'deleted', "deletedAt" IS NOT NULL, 'url', '/api/files/' || filename) FROM "ChildDocument"
        UNION ALL SELECT 'observation', jsonb_build_object('childId', "childId", 'authorId', "userId", 'visible', visible, 'urls', photos) FROM "Observation"
        UNION ALL SELECT 'portfolio', jsonb_build_object('childId', "childId", 'url', "fileUrl") FROM "PortfolioItem"
        UNION ALL SELECT 'note', jsonb_build_object('childId', "childId", 'authorId', "specialistId", 'visibility', visibility, 'urls', attachments) FROM "SpecialistNote"
        UNION ALL SELECT 'feed', jsonb_build_object('childId', "childId", 'groupId', "groupId", 'scope', scope, 'urls', "mediaUrls") FROM "FeedItem"
        UNION ALL SELECT 'chat', jsonb_build_object('chatId', "chatRoomId", 'urls', attachments) FROM "ChatMessage"
        UNION ALL SELECT 'event', jsonb_build_object('groupId', "groupId", 'audience', audience, 'urls', "mediaUrls") FROM "Event"
        UNION ALL SELECT 'kb', jsonb_build_object('published', published, 'cover', "coverUrl", 'video', "videoUrl", 'body', body) FROM "KbArticle"
        UNION ALL SELECT 'site', jsonb_build_object('value', value) FROM "SiteContent"
        UNION ALL SELECT 'avatar', jsonb_build_object('id', id, 'url', avatar) FROM "User"
        UNION ALL SELECT 'menu', jsonb_build_object('content', content) FROM "Menu"
        UNION ALL SELECT 'library', jsonb_build_object('audience', audience, 'published', published, 'authorId', "authorId", 'reviewStatus', "reviewStatus", 'urls', attachments, 'body', body) FROM "MethodicalDocument"
      ) refs WHERE data::text ~ ${pattern}
    `;
    // Child documents keep their stricter ACL even when copied into a public
    // post/avatar. Removed documents and orphaned uploads must not fall back to
    // uploader access. Teachers and specialists never inherit child-file access.
    const childDocuments = references.filter(reference => reference.kind === 'child-document');
    if (childDocuments.length || meta?.scope === 'child-document') {
      if (user.role === 'admin') return;
      if (user.role === 'parent') {
        for (const reference of childDocuments) {
          if (!reference.data.deleted && await this.childAccess(reference.data.childId, user)) return;
        }
      }
      throw new ForbiddenException('Нет доступа к документам ребенка');
    }
    // Library attachments retain document permissions even if their URL is copied elsewhere.
    const documents = references.filter(reference => reference.kind === 'library');
    if (documents.length) {
      if (enabledFeatures().library && documents.some(reference => canReadDocument(reference.data as any, user.role, user.id))) return;
      throw new ForbiddenException('Нет доступа к материалу');
    }
    if (user.role === 'admin') return;
    if (meta?.uploaderId === user.id || meta?.scope === 'public') return;
    for (const reference of references) {
      if (await this.canReadReference(reference, user)) return;
    }
    throw new ForbiddenException('Нет доступа к файлу');
  }

  async assertCanAttach(value: unknown, user: FileRequester): Promise<void> {
    // Prevent granting oneself access by pasting a private URL into an avatar/chat/post.
    for (const filename of referencedFiles(value)) await this.assertCanRead(filename, user);
  }

  private async childAccess(id: unknown, user: FileRequester): Promise<boolean> {
    if (typeof id !== 'string' || !id) return false;
    try { await this.access.checkChildAccess(id, user); return true; }
    catch (error) { if (error instanceof ForbiddenException) return false; throw error; }
  }

  private async groupAccess(id: unknown, user: FileRequester): Promise<boolean> {
    if (typeof id !== 'string' || !id) return false;
    return !!await this.prisma.child.findFirst({
      where: {
        groupId: id,
        ...(user.role === 'parent' ? { parents: { some: { parentId: user.id } } } :
          user.role === 'teacher' ? { group: { teacherId: user.id } } :
            ['psychologist', 'pediatrician'].includes(user.role) ? { status: 'active' as const } : { id: '__denied__' }),
      }, select: { id: true },
    });
  }

  private async canReadReference({ kind, data: r }: Reference, user: FileRequester): Promise<boolean> {
    switch (kind) {
      case 'site': case 'menu': return true;
      case 'kb': return user.role !== 'parent' || r.published === true;
      case 'child': return this.childAccess(r.id, user);
      case 'portfolio': return this.childAccess(r.childId, user);
      case 'observation':
        return (user.role !== 'parent' || r.visible === true) && await this.childAccess(r.childId, user);
      case 'note': {
        const visible = ['psychologist', 'pediatrician'].includes(user.role) ? r.authorId === user.id :
          user.role === 'parent' ? r.visibility === 'with_parent' :
            user.role === 'teacher' && ['with_teacher', 'with_parent'].includes(r.visibility);
        return visible && await this.childAccess(r.childId, user);
      }
      case 'feed':
        if (r.scope === 'school') return true;
        if (r.scope === 'child') return this.childAccess(r.childId, user);
        return r.scope === 'group' && await this.groupAccess(r.groupId, user);
      case 'event':
        if (r.audience === 'all') return true;
        if (r.audience === 'parents') return user.role === 'parent';
        if (r.audience === 'staff') return user.role !== 'parent';
        return r.audience === 'group' && ['parent', 'teacher'].includes(user.role) && await this.groupAccess(r.groupId, user);
      case 'chat':
        return !!await this.prisma.chatParticipant.findUnique({ where: { chatRoomId_userId: { chatRoomId: r.chatId, userId: user.id } } });
      case 'avatar':
        return !!await this.prisma.user.findFirst({ where: {
          id: r.id, deletedAt: null, blockedAt: null,
          OR: [{ id: user.id }, { role: { not: 'parent' } },
            { chatParticipants: { some: { chatRoom: { participants: { some: { userId: user.id } } } } } }],
        }, select: { id: true } });
      default: return false;
    }
  }
}
