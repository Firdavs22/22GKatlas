import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
    private config: ConfigService,
  ) {}

  async login(email: string, password: string, deviceId?: string, deviceName?: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Неверный email или пароль');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Неверный email или пароль');

    const tokens = await this.generateTokenPair(user.id, user.email, user.role, deviceId, deviceName);
    const { password: _, ...userWithoutPassword } = user;
    return { ...tokens, user: userWithoutPassword };
  }

  async refreshToken(refreshToken: string) {
    // Find refresh token in DB
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored) throw new UnauthorizedException('Недействительный refresh-токен');
    if (stored.expiresAt < new Date()) {
      // Clean up expired token
      await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new UnauthorizedException('Refresh-токен истёк');
    }

    // Rotate: delete old refresh token and issue a new pair
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const tokens = await this.generateTokenPair(
      stored.user.id,
      stored.user.email,
      stored.user.role,
      stored.deviceId ?? undefined,
      stored.deviceName ?? undefined,
    );

    const { password: _, ...userWithoutPassword } = stored.user;
    return { ...tokens, user: userWithoutPassword };
  }

  async logout(refreshToken: string) {
    try {
      await this.prisma.refreshToken.delete({ where: { token: refreshToken } });
    } catch {
      // Token may already be deleted — that's fine
    }
    return { message: 'Выход выполнен' };
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { message: 'Выход со всех устройств выполнен' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getActiveSessions(userId: string) {
    return this.prisma.refreshToken.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: { id: true, deviceId: true, deviceName: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async checkInvite(token: string) {
    if (!token) throw new BadRequestException('Токен не указан');
    let payload: any;
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new BadRequestException('Неверный или просроченный токен');
    }
    if (payload.type !== 'invite') {
      throw new BadRequestException('Неверный тип токена');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true, password: true },
    });
    if (!user) throw new NotFoundException();
    return {
      name: user.name,
      email: user.email,
      role: user.role,
      alreadyActivated: !!user.password,
    };
  }

  async acceptInvite(
    token: string,
    password: string,
    name?: string,
    consent?: boolean,
  ) {
    if (consent !== true) {
      throw new BadRequestException(
        'Необходимо согласиться с обработкой персональных данных (152-ФЗ).',
      );
    }

    let payload: any;
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new BadRequestException('Неверный или просроченный токен');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new NotFoundException();

    if (payload.type !== 'invite') {
      throw new BadRequestException('Неверный тип токена');
    }

    const hashed = await bcrypt.hash(password, 12);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        consentGivenAt: new Date(),
        ...(name && name.trim() ? { name: name.trim() } : {}),
      },
    });

    const { password: _, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  }

  generateInviteToken(userId: string): string {
    return this.jwt.sign({ sub: userId, type: 'invite' }, { expiresIn: '30d' });
  }

  /**
   * Forgot password — always returns 200 to prevent email enumeration.
   * Sends reset-link by email if the address exists.
   */
  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user || user.password === 'INVALIDATED') return { ok: true };
    const token = this.jwt.sign({ sub: user.id, type: 'reset' }, { expiresIn: '1h' });
    const publicAppUrl = this.config.get<string>('PUBLIC_APP_URL') || '';
    const link = `${publicAppUrl}/reset?token=${encodeURIComponent(token)}`;
    try {
      await this.mail.send({
        to: user.email,
        subject: 'Сброс пароля в ГлобоАтлас',
        html: `<p>Здравствуйте, ${user.name}.</p>
          <p>Чтобы сбросить пароль, перейдите по <a href="${link}">этой ссылке</a>. Она действует 1 час.</p>
          <p>Если вы не запрашивали сброс — просто игнорируйте письмо.</p>`,
      });
    } catch {
      // Swallow — don't leak failure to caller.
    }
    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string) {
    let payload: any;
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new BadRequestException('Ссылка недействительна или истекла');
    }
    if (payload.type !== 'reset') throw new BadRequestException('Неверный тип токена');

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.password === 'INVALIDATED') throw new BadRequestException('Аккаунт недоступен');

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    return { ok: true };
  }

  // ── Private helpers ────────────────────────────────────

  private async generateTokenPair(
    userId: string,
    email: string,
    role: string,
    deviceId?: string,
    deviceName?: string,
  ) {
    // Access token (short-lived, 15 min — set in auth.module.ts)
    const accessToken = this.jwt.sign({ sub: userId, email, role });

    // Refresh token (long-lived, 30 days, stored in DB)
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        deviceId: deviceId || null,
        deviceName: deviceName || null,
        expiresAt,
      },
    });

    // Cleanup: delete expired tokens for this user (background, don't block response)
    void this.prisma.refreshToken
      .deleteMany({ where: { userId, expiresAt: { lt: new Date() } } })
      .catch((err) => {
        // Log but don't propagate — cleanup failure shouldn't break login
        console.warn('Failed to cleanup expired refresh tokens:', err.message);
      });

    return { token: accessToken, refreshToken };
  }
}
