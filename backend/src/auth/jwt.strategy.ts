import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { assertAccessPayload, extractAccessToken } from './access-token';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = config.get('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET environment variable is required');
    super({
      jwtFromRequest: extractAccessToken,
      secretOrKey: secret,
      algorithms: ['HS256'],
    });
  }

  async validate(payload: unknown) {
    assertAccessPayload(payload);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true, email: true, name: true, role: true, phone: true,
        deletedAt: true, blockedAt: true,
      },
    });
    if (!user) throw new UnauthorizedException();
    if (user.deletedAt) throw new UnauthorizedException('Аккаунт удален');
    if (user.blockedAt) throw new UnauthorizedException('Доступ заблокирован администратором');
    // Не возвращаем эти поля во всех консьюмерах — стрипаем
    const { deletedAt: _d, blockedAt: _b, ...safe } = user;
    return safe;
  }
}
