import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { parentInvite } from '../mail/mail.templates';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private config: ConfigService,
  ) {}

  /** Best-effort: send invite email but don't fail the request if SMTP is down. */
  private async sendInviteEmail(opts: { to: string; parentName: string; childName?: string; token: string }) {
    const appUrl = (this.config.get<string>('PUBLIC_APP_URL') || 'http://localhost:3000').replace(/\/$/, '');
    const inviteUrl = `${appUrl}/invite?token=${encodeURIComponent(opts.token)}`;
    const { subject, html, text } = parentInvite({
      parentName: opts.parentName,
      childName: opts.childName,
      inviteUrl,
    });
    try {
      await this.mail.send({ to: opts.to, subject, html, text });
    } catch (err) {
      this.logger.warn(`Не удалось отправить приглашение на ${opts.to}: ${(err as Error).message}`);
    }
  }

  // ── GROUPS ────────────────────────────────────────────────
  getGroups() {
    return this.prisma.group.findMany({
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        _count: { select: { children: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  getGroup(id: string) {
    return this.prisma.group.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, name: true, email: true, avatar: true } },
        children: { orderBy: { name: 'asc' }, include: { parents: { include: { parent: { select: { id: true, name: true, email: true, phone: true } } } } } },
        schedules: { orderBy: [{ dayOfWeek: 'asc' }, { timeStart: 'asc' }] },
      },
    });
  }

  async createGroup(dto: any) {
    if (dto.teacherId) {
      await this.prisma.group.updateMany({
        where: { teacherId: dto.teacherId },
        data: { teacherId: null },
      });
    }
    return this.prisma.group.create({ data: dto });
  }

  async updateGroup(id: string, dto: any) {
    if (dto.teacherId) {
      await this.prisma.group.updateMany({
        where: { teacherId: dto.teacherId, id: { not: id } },
        data: { teacherId: null },
      });
    }
    return this.prisma.group.update({ where: { id }, data: dto });
  }

  async deleteGroup(id: string) {
    return this.prisma.$transaction(async (tx) => {
      // Unlink children from this group
      await tx.child.updateMany({ where: { groupId: id }, data: { groupId: null } });
      // Delete schedules
      await tx.schedule.deleteMany({ where: { groupId: id } });
      // Delete feed items linked to this group
      await tx.feedItem.deleteMany({ where: { groupId: id } });
      return tx.group.delete({ where: { id } });
    });
  }

  // ── CHILDREN ─────────────────────────────────────────────
  getChildren() {
    return this.prisma.child.findMany({
      include: {
        group: { select: { id: true, name: true } },
        parents: { include: { parent: { select: { id: true, name: true, email: true, phone: true } } } },
        specialists: { include: { specialist: { select: { id: true, name: true, role: true } } } },
      },
      orderBy: { name: 'asc' },
    });
  }

  getChild(id: string) {
    return this.prisma.child.findUnique({
      where: { id },
      include: {
        group: { select: { id: true, name: true, teacher: { select: { name: true } } } },
        parents: { include: { parent: { select: { id: true, name: true, email: true, phone: true, avatar: true } } } },
        specialists: { include: { specialist: { select: { id: true, name: true, role: true } } } },
        attendance: { orderBy: { date: 'desc' }, take: 14 },
      },
    });
  }

  async createChild(dto: any, authService?: any) {
    const { name, birthDate, contacts, representatives, extraServices, allergies, documents, notes, groupId, photo, parentLinks } = dto;
    const parents = this.normalizeParentLinks(parentLinks);
    if (!parents?.length) {
      throw new BadRequestException('Укажите хотя бы одного родителя ребёнка');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const child = await tx.child.create({
        data: {
          name,
          birthDate: new Date(birthDate),
          ...(groupId ? { groupId } : {}),
          ...(photo ? { photo } : {}),
          ...(contacts ? { contacts } : {}),
          ...(representatives ? { representatives } : {}),
          ...(extraServices ? { extraServices } : {}),
          ...(allergies ? { allergies } : {}),
          ...(documents ? { documents } : {}),
          ...(notes ? { notes } : {}),
        },
      });
      const synced = await this.syncChildParents(tx, child.id, parents);
      const full = await tx.child.findUnique({
        where: { id: child.id },
        include: {
          group: { select: { id: true, name: true } },
          parents: { include: { parent: { select: { id: true, name: true, email: true, phone: true } } } },
          specialists: { include: { specialist: { select: { id: true, name: true, role: true } } } },
        },
      });
      return { child: full, synced };
    });

    // Issue invite tokens + send emails for freshly-created parents (outside the transaction).
    const invites = await this.issueInvitesForNewParents(result.synced, result.child?.name, authService);
    return { ...result.child, invites };
  }

  async updateChild(id: string, dto: any, authService?: any) {
    const { name, birthDate, contacts, representatives, extraServices, allergies, documents, notes, groupId, photo, parentLinks } = dto;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (birthDate !== undefined) data.birthDate = new Date(birthDate);
    if (groupId !== undefined) data.groupId = groupId || null;
    if (photo !== undefined) data.photo = photo;
    if (contacts !== undefined) data.contacts = contacts;
    if (representatives !== undefined) data.representatives = representatives;
    if (extraServices !== undefined) data.extraServices = extraServices;
    if (allergies !== undefined) data.allergies = allergies;
    if (documents !== undefined) data.documents = documents;
    if (notes !== undefined) data.notes = notes;
    const parents = parentLinks === undefined ? undefined : this.normalizeParentLinks(parentLinks);
    if (parentLinks !== undefined && !parents?.length) {
      throw new BadRequestException('У ребёнка должен быть хотя бы один родитель');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.child.update({ where: { id }, data });
      const synced = parents ? await this.syncChildParents(tx, id, parents) : [];
      const full = await tx.child.findUnique({
        where: { id },
        include: {
          group: { select: { id: true, name: true } },
          parents: { include: { parent: { select: { id: true, name: true, email: true, phone: true } } } },
          specialists: { include: { specialist: { select: { id: true, name: true, role: true } } } },
        },
      });
      return { child: full, synced };
    });

    const invites = await this.issueInvitesForNewParents(result.synced, result.child?.name, authService);
    return { ...result.child, invites };
  }

  private async issueInvitesForNewParents(
    synced: { id: string; name: string; email: string; isNew: boolean }[],
    childName: string | undefined,
    authService: any,
  ): Promise<{ parentId: string; name: string; email: string; inviteToken: string }[]> {
    if (!authService) return [];
    const invites: { parentId: string; name: string; email: string; inviteToken: string }[] = [];
    for (const p of synced) {
      if (!p.isNew) continue;
      const inviteToken = authService.generateInviteToken(p.id);
      invites.push({ parentId: p.id, name: p.name, email: p.email, inviteToken });
      await this.sendInviteEmail({
        to: p.email,
        parentName: p.name,
        childName,
        token: inviteToken,
      });
    }
    return invites;
  }
  archiveChild(id: string) { return this.prisma.child.update({ where: { id }, data: { status: 'left' } }); }
  enrollChild(childId: string, groupId: string) {
    return this.prisma.child.update({ where: { id: childId }, data: { groupId } });
  }

  async assignSpecialist(childId: string, specialistId: string, role: Role) {
    return this.prisma.childSpecialist.upsert({
      where: { childId_specialistId: { childId, specialistId } },
      update: { role },
      create: { childId, specialistId, role },
    });
  }

  async inviteParent(childId: string, email: string, name: string | undefined, authService: any) {
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      const tempPassword = await bcrypt.hash(Math.random().toString(36), 10);
      user = await this.prisma.user.create({
        data: { email, password: tempPassword, name: name || email, role: 'parent' },
      });
    }
    await this.prisma.childParent.upsert({
      where: { childId_parentId: { childId, parentId: user.id } },
      update: {},
      create: { childId, parentId: user.id },
    });
    const inviteToken = authService.generateInviteToken(user.id);
    const child = await this.prisma.child.findUnique({ where: { id: childId }, select: { name: true } });
    await this.sendInviteEmail({
      to: user.email,
      parentName: user.name,
      childName: child?.name,
      token: inviteToken,
    });
    return { inviteToken, userId: user.id };
  }

  private normalizeParentLinks(parentLinks: any[] | undefined) {
    if (parentLinks === undefined) return undefined;
    return parentLinks
      .map((parent) => ({
        id: parent.id || undefined,
        name: String(parent.name || '').trim(),
        email: String(parent.email || '').trim().toLowerCase(),
        phone: String(parent.phone || '').trim(),
      }))
      .filter((parent) => parent.id || parent.name || parent.email || parent.phone)
      .map((parent) => {
        if (!parent.id && !parent.email) {
          throw new BadRequestException('Для родителя нужен email, чтобы создать доступ в систему');
        }
        if (!parent.name) {
          throw new BadRequestException('Укажите ФИО родителя');
        }
        return parent;
      });
  }

  private async syncChildParents(
    tx: any,
    childId: string,
    parents: { id?: string; name: string; email: string; phone?: string }[],
  ): Promise<{ id: string; name: string; email: string; isNew: boolean }[]> {
    const parentIds: string[] = [];
    const synced: { id: string; name: string; email: string; isNew: boolean }[] = [];

    for (const parent of parents) {
      let user = parent.id
        ? await tx.user.findUnique({ where: { id: parent.id } })
        : await tx.user.findUnique({ where: { email: parent.email } });

      if (user && user.role !== 'parent') {
        throw new BadRequestException(`Пользователь ${user.email} уже существует, но это не родитель`);
      }

      let isNew = false;
      if (user) {
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            name: parent.name,
            ...(parent.phone !== undefined ? { phone: parent.phone || null } : {}),
          },
        });
      } else {
        const tempPassword = await bcrypt.hash(Math.random().toString(36), 10);
        user = await tx.user.create({
          data: {
            email: parent.email,
            password: tempPassword,
            name: parent.name,
            phone: parent.phone || null,
            role: 'parent',
          },
        });
        isNew = true;
      }

      parentIds.push(user.id);
      synced.push({ id: user.id, name: user.name, email: user.email, isNew });
      await tx.childParent.upsert({
        where: { childId_parentId: { childId, parentId: user.id } },
        update: {},
        create: { childId, parentId: user.id },
      });
    }

    await tx.childParent.deleteMany({
      where: {
        childId,
        parentId: { notIn: parentIds },
      },
    });

    return synced;
  }

  // ── STAFF ─────────────────────────────────────────────────
  getStaff() {
    return this.prisma.user.findMany({
      where: { role: { in: ['teacher', 'psychologist', 'pediatrician', 'admin'] } },
      select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
  }

  getStaffById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { 
        id: true, name: true, email: true, role: true, avatar: true, createdAt: true,
        teacherGroup: { select: { id: true, name: true, ageRange: true, year: true } },
        specialistChildren: { include: { child: { select: { id: true, name: true, group: { select: { name: true } } } } } }
      },
    });
  }

  async inviteStaff(email: string, name: string, role: Role, authService: any) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Пользователь с таким email уже существует');
    const tempPassword = await bcrypt.hash(Math.random().toString(36), 10);
    const user = await this.prisma.user.create({ data: { email, password: tempPassword, name, role } });
    const inviteToken = authService.generateInviteToken(user.id);
    return { inviteToken, userId: user.id };
  }

  updateStaff(id: string, dto: any) {
    const { password, email, ...rest } = dto;
    return this.prisma.user.update({
      where: { id },
      data: rest,
      select: { id: true, name: true, email: true, role: true, avatar: true },
    });
  }

  getParents() {
    return this.prisma.user.findMany({
      where: { role: 'parent' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        createdAt: true,
        parentChildren: {
          include: {
            child: { select: { id: true, name: true, status: true, group: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async inviteParentAccount(dto: { email: string; name: string; phone?: string; childIds?: string[] }, authService: any) {
    const email = String(dto.email || '').trim().toLowerCase();
    const name = String(dto.name || '').trim();
    const phone = String(dto.phone || '').trim();
    if (!email || !name) throw new BadRequestException('Укажите ФИО и email родителя');

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (user && user.role !== 'parent') {
      throw new ConflictException('Пользователь с таким email уже существует, но это не родитель');
    }

    if (!user) {
      const tempPassword = await bcrypt.hash(Math.random().toString(36), 10);
      user = await this.prisma.user.create({
        data: { email, password: tempPassword, name, phone: phone || null, role: 'parent' },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { name, phone: phone || null },
      });
    }

    const childIds = Array.isArray(dto.childIds) ? dto.childIds.filter(Boolean) : [];
    if (childIds.length) {
      await Promise.all(childIds.map((childId) =>
        this.prisma.childParent.upsert({
          where: { childId_parentId: { childId, parentId: user!.id } },
          update: {},
          create: { childId, parentId: user!.id },
        }),
      ));
    }

    const inviteToken = authService.generateInviteToken(user.id);

    // Pick one of the linked children's names for the email body (if any)
    let childName: string | undefined;
    if (childIds.length) {
      const child = await this.prisma.child.findUnique({
        where: { id: childIds[0] },
        select: { name: true },
      });
      childName = child?.name;
    }
    await this.sendInviteEmail({
      to: user.email,
      parentName: user.name,
      childName,
      token: inviteToken,
    });

    return { inviteToken, userId: user.id };
  }

  async reissueParentInvite(id: string, authService: any) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: 'parent' },
      select: {
        id: true, name: true, email: true,
        parentChildren: { take: 1, include: { child: { select: { name: true } } } },
      },
    });
    if (!user) throw new BadRequestException('Родитель не найден');
    const inviteToken = authService.generateInviteToken(user.id);
    const childName = user.parentChildren[0]?.child?.name;
    await this.sendInviteEmail({
      to: user.email,
      parentName: user.name,
      childName,
      token: inviteToken,
    });
    return { inviteToken, userId: user.id, name: user.name, email: user.email };
  }

  updateParent(id: string, dto: any) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.phone !== undefined) data.phone = dto.phone || null;
    if (dto.email !== undefined) data.email = String(dto.email).trim().toLowerCase();
    return this.prisma.$transaction(async (tx) => {
      const parent = await tx.user.findFirst({ where: { id, role: 'parent' }, select: { id: true } });
      if (!parent) throw new BadRequestException('Родитель не найден');
      return tx.user.update({
        where: { id },
        data,
        select: { id: true, name: true, email: true, phone: true, avatar: true, createdAt: true },
      });
    });
  }

  // ── AREAS ─────────────────────────────────────────────────
  getAreas() {
    return this.prisma.area.findMany({
      include: { groups: { include: { skills: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  createArea(dto: any) { return this.prisma.area.create({ data: dto }); }
  updateArea(id: string, dto: any) { return this.prisma.area.update({ where: { id }, data: dto }); }

  async deleteArea(id: string) {
    // Check if any skills in this area have progress
    const hasProgress = await this.prisma.progress.count({
      where: { skill: { group: { areaId: id } } },
    });
    if (hasProgress > 0) throw new BadRequestException('В этой зоне есть навыки с прогрессом детей. Сначала архивируйте их.');

    // Cascade: delete skills -> skill groups -> area
    await this.prisma.skill.deleteMany({ where: { group: { areaId: id } } });
    await this.prisma.skillGroup.deleteMany({ where: { areaId: id } });
    return this.prisma.area.delete({ where: { id } });
  }

  // ── SKILL GROUPS ──────────────────────────────────────────
  getSkillGroups() {
    return this.prisma.skillGroup.findMany({
      include: { area: true, skills: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  createSkillGroup(dto: any) { return this.prisma.skillGroup.create({ data: dto }); }
  updateSkillGroup(id: string, dto: any) { return this.prisma.skillGroup.update({ where: { id }, data: dto }); }

  async deleteSkillGroup(id: string) {
    const hasProgress = await this.prisma.progress.count({ where: { skill: { groupId: id } } });
    if (hasProgress > 0) throw new BadRequestException('В группе есть навыки с прогрессом детей');
    await this.prisma.skill.deleteMany({ where: { groupId: id } });
    return this.prisma.skillGroup.delete({ where: { id } });
  }

  // ── SKILLS ────────────────────────────────────────────────
  getSkills() {
    return this.prisma.skill.findMany({
      include: { group: { include: { area: true } } },
      orderBy: [{ group: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    });
  }

  createSkill(dto: any) { return this.prisma.skill.create({ data: dto }); }
  updateSkill(id: string, dto: any) { return this.prisma.skill.update({ where: { id }, data: dto }); }

  async deleteSkill(id: string) {
    const hasProgress = await this.prisma.progress.count({ where: { skillId: id } });
    if (hasProgress > 0) throw new BadRequestException('Навык имеет прогресс у детей. Используйте архивирование.');
    return this.prisma.skill.delete({ where: { id } });
  }

  async reorderSkills(items: { id: string; sortOrder: number }[]) {
    await Promise.all(items.map(({ id, sortOrder }) =>
      this.prisma.skill.update({ where: { id }, data: { sortOrder } }),
    ));
    return { ok: true };
  }

  // ── EXCEL IMPORT ───────────────────────────────────────
  async importSkillsFromExcel(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) throw new BadRequestException('Файл пуст');

    // Auto-detect columns
    const keys = Object.keys(rows[0]);
    const findCol = (variants: string[]) => {
      for (const v of variants) {
        const found = keys.find(k => k.toLowerCase().includes(v.toLowerCase()));
        if (found) return found;
      }
      return null;
    };

    const dataKeys = keys.filter(k => !k.toLowerCase().match(/^(\s*|№|#|id|п\/?п|номер.*)$/i));

    const areaCol = findCol(['Зона', 'зона', 'Area', 'area', 'Зона развития', 'Раздел', 'раздел', 'Section', 'Область', 'область', 'Направление', 'направление']) || dataKeys[0];
    const sgCol = findCol(['Группа', 'группа', 'Group', 'group', 'Группа навыков', 'Подраздел', 'подраздел', 'Категория', 'категория', 'Подгруппа', 'подгруппа']) || dataKeys[1];
    const skillCol = findCol(['Презентация', 'презентация', 'Навык', 'навык', 'Skill', 'skill', 'Название', 'название', 'Name', 'name', 'Упражнение', 'упражнение', 'Тема', 'тема']) || dataKeys[2];
    const descCol = findCol(['Описание', 'описание', 'Description', 'description', 'Комментарий', 'комментарий']);
    const ageCol = findCol(['Возраст', 'возраст', 'Age', 'age', 'Возрастная группа', 'Возраст ребенка']);
    const devSkillsCol = findCol(['развиваем', 'развитие']);

    if (!areaCol || !sgCol || !skillCol) {
      throw new BadRequestException(`Не удалось определить колонки. Найденные заголовки: ${keys.join(', ')}. Нужны как минимум 3 колонки: Зона, Группа, Навык`);
    }

    const AREA_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#FFD93D', '#6BCB77', '#4D96FF'];
    const AREA_ICONS = ['🏠', '👁️', '🔢', '📖', '🌍', '🎨', '🎵', '🧩'];

    const areaMap = new Map<string, string>();
    const sgMap = new Map<string, string>();
    let areaOrder = 0;
    let sgOrder = 0;
    let skillOrder = 0;
    let imported = 0;

    for (const row of rows) {
      const areaTitle = String(row[areaCol] || '').trim();
      const sgTitle = String(row[sgCol] || '').trim();
      const skillTitle = String(row[skillCol] || '').trim();
      const ageRange = ageCol ? String(row[ageCol] || '').trim() || null : null;
      
      let description = descCol ? String(row[descCol] || '').trim() : '';
      const devSkills = devSkillsCol ? String(row[devSkillsCol] || '').trim() : '';
      
      if (devSkills) {
        description = description ? `${description}\n\nРазвиваемые навыки: ${devSkills}` : `Развиваемые навыки: ${devSkills}`;
      }
      
      const finalDescription = description || null;

      if (!areaTitle || !sgTitle || !skillTitle) continue;

      // Upsert Area
      if (!areaMap.has(areaTitle)) {
        const area = await this.prisma.area.upsert({
          where: { id: `import-area-${areaTitle.toLowerCase().replace(/\s+/g, '-')}` },
          update: { title: areaTitle },
          create: {
            id: `import-area-${areaTitle.toLowerCase().replace(/\s+/g, '-')}`,
            title: areaTitle,
            icon: AREA_ICONS[areaOrder % AREA_ICONS.length],
            color: AREA_COLORS[areaOrder % AREA_COLORS.length],
            sortOrder: areaOrder + 100,
          },
        });
        areaMap.set(areaTitle, area.id);
        areaOrder++;
      }

      // Upsert SkillGroup
      const sgKey = `${areaTitle}::${sgTitle}`;
      if (!sgMap.has(sgKey)) {
        const sg = await this.prisma.skillGroup.upsert({
          where: { id: `import-sg-${sgTitle.toLowerCase().replace(/\s+/g, '-')}-${areaMap.get(areaTitle)!.slice(-8)}` },
          update: { title: sgTitle },
          create: {
            id: `import-sg-${sgTitle.toLowerCase().replace(/\s+/g, '-')}-${areaMap.get(areaTitle)!.slice(-8)}`,
            title: sgTitle,
            areaId: areaMap.get(areaTitle)!,
            sortOrder: sgOrder++,
          },
        });
        sgMap.set(sgKey, sg.id);
      }

      // Create skill
      await this.prisma.skill.create({
        data: {
          title: skillTitle,
          description: finalDescription,
          ageRange,
          groupId: sgMap.get(sgKey)!,
          sortOrder: skillOrder++,
        },
      });
      imported++;
    }

    return { imported, areas: areaMap.size, skillGroups: sgMap.size };
  }

  // ── ATTENDANCE ─────────────────────────────────────────────
  async getAttendanceByQuery(query: { groupId?: string; date?: string }) {
    const where: any = {};
    if (query.groupId) where.child = { groupId: query.groupId };
    if (query.date) where.date = new Date(query.date);

    return this.prisma.attendance.findMany({
      where,
      include: { child: { select: { id: true, name: true, groupId: true, group: { select: { name: true } } } } },
      orderBy: [{ date: 'desc' }, { child: { name: 'asc' } }],
      take: 500,
    });
  }

  async bulkUpsertAttendance(dto: { groupId: string; date: string; records: { childId: string; status: string }[] }) {
    const date = new Date(dto.date);
    return this.prisma.$transaction(
      dto.records.map((r) =>
        this.prisma.attendance.upsert({
          where: { childId_date: { childId: r.childId, date } },
          update: { status: r.status as any },
          create: { childId: r.childId, date, status: r.status as any },
        }),
      ),
    );
  }

  updateAttendance(id: string, dto: any) {
    return this.prisma.attendance.update({ where: { id }, data: { status: dto.status } });
  }

  // ── PAYMENTS ───────────────────────────────────────────────
  getPayments() {
    return this.prisma.payment.findMany({
      include: { child: { select: { id: true, name: true, group: { select: { name: true } } } } },
      orderBy: [{ month: 'desc' }, { child: { name: 'asc' } }],
    });
  }

  createPayment(dto: any) {
    return this.prisma.payment.create({
      data: {
        childId: dto.childId,
        month: new Date(dto.month),
        amount: dto.amount,
        paid: dto.paid || 0,
        status: dto.status || 'pending',
      },
    });
  }

  updatePayment(id: string, dto: any) {
    const data: any = {};
    if (dto.paid !== undefined) data.paid = dto.paid;
    if (dto.status) data.status = dto.status;
    if (dto.amount !== undefined) data.amount = dto.amount;
    return this.prisma.payment.update({ where: { id }, data });
  }

  // ── REPORTS (EXCEL) ─────────────────────────────────────────
  async generateAttendanceReport(monthStr?: string) {
    const date = monthStr ? new Date(`${monthStr}-01T00:00:00Z`) : new Date();
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const attendances = await this.prisma.attendance.findMany({
      where: { date: { gte: start, lte: end } },
      include: { child: { select: { name: true, group: { select: { name: true } } } } },
      orderBy: { date: 'asc' }
    });

    const data = attendances.map(a => ({
      'Ребенок': a.child.name,
      'Группа': a.child.group?.name || '-',
      'Дата': a.date.toISOString().split('T')[0],
      'Статус': a.status === 'present' ? 'Присутствовал' : a.status === 'absent' ? 'Отсутствовал' : a.status,
      'Причина / Комментарий': ''
    }));

    const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ 'Сообщение': 'Нет данных за выбранный период' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Посещаемость');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  async generateProgressReport(groupId?: string) {
    const where = groupId && groupId !== 'all' ? { child: { groupId } } : {};
    const progress = await this.prisma.progress.findMany({
      where,
      include: { 
        child: { select: { name: true, group: { select: { name: true } } } },
        skill: { select: { title: true, group: { select: { title: true, area: { select: { title: true } } } } } }
      },
      orderBy: [{ child: { name: 'asc' } }, { updatedAt: 'desc' }]
    });

    const data = progress.map(p => ({
      'Ребёнок': p.child.name,
      'Группа': p.child.group?.name || '-',
      'Зона': p.skill.group.area.title,
      'Категория': p.skill.group.title,
      'Навык': p.skill.title,
      'Стадия': p.stage === 'none' ? 'Не начат' : p.stage === 'mastered' ? 'Освоен' : 'В процессе',
      'Обновлено': p.updatedAt.toISOString().split('T')[0]
    }));

    const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ 'Сообщение': 'Нет данных' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Прогресс');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  async generatePaymentsReport(monthStr?: string) {
    const date = monthStr ? new Date(`${monthStr}-01T00:00:00Z`) : new Date();
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const payments = await this.prisma.payment.findMany({
      where: { month: { gte: start, lte: end } },
      include: { child: { select: { name: true, group: { select: { name: true } } } } },
      orderBy: { child: { name: 'asc' } }
    });

    const data = payments.map(p => ({
      'Ребёнок': p.child.name,
      'Группа': p.child.group?.name || '-',
      'Месяц': p.month.toISOString().split('T')[0].substring(0, 7),
      'Сумма начислено': p.amount,
      'Оплачено': p.paid,
      'Статус': p.status === 'paid' ? 'Оплачено' : p.status === 'overdue' ? 'Просрочено' : 'Ожидает'
    }));

    const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ 'Сообщение': 'Нет данных за выбранный период' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Оплаты');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
