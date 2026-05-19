import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

const DELETE_CONFIRMATION = 'УДАЛИТЬ';

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, role: true,
        avatar: true, phone: true,
        consentGivenAt: true, onboardingCompletedAt: true, createdAt: true,
      },
    });
    return u;
  }

  async completeOnboarding(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingCompletedAt: new Date() },
    });
    return { ok: true };
  }

  async resetOnboarding(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingCompletedAt: null },
    });
    return { ok: true };
  }

  async update(userId: string, dto: { name?: string; email?: string; phone?: string; avatar?: string }) {
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.email !== undefined) data.email = dto.email.trim().toLowerCase();
    if (dto.phone !== undefined) data.phone = dto.phone.trim() || null;
    if (dto.avatar !== undefined) data.avatar = dto.avatar || null;

    if (data.email) {
      const exists = await this.prisma.user.findFirst({
        where: { email: data.email as string, NOT: { id: userId } },
      });
      if (exists) throw new BadRequestException('Этот email уже используется');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true, email: true, name: true, role: true,
        avatar: true, phone: true,
      },
    });
    return updated;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const ok = await bcrypt.compare(oldPassword, user.password);
    if (!ok) throw new BadRequestException('Старый пароль неверен');

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
    // Invalidate all refresh tokens — force re-login on every device.
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { ok: true };
  }

  /**
   * Soft-delete: anonymize PII, mark `deletedAt`, revoke all sessions.
   * A periodic job (out of scope here) hard-deletes records after 30 days.
   */
  async deleteAccount(userId: string, password: string, confirmation: string) {
    if (confirmation !== DELETE_CONFIRMATION) {
      throw new BadRequestException(`Введите слово "${DELETE_CONFIRMATION}" для подтверждения`);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    // Admins cannot self-delete (must use another admin / SQL). Avoids locking everyone out.
    if (user.role === 'admin') {
      throw new ForbiddenException(
        'Администратор не может удалить свой аккаунт самостоятельно. Свяжитесь с другим админом.',
      );
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new BadRequestException('Пароль неверен');

    const anonId = `deleted-${userId.slice(0, 8)}`;
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: `${anonId}@deleted.local`,
          name: 'Удалённый пользователь',
          phone: null,
          avatar: null,
          password: 'INVALIDATED',
          deletedAt: new Date(),
        },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
    ]);
    return { ok: true };
  }
}
