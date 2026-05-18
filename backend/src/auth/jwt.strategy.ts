import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import type { Request } from 'express';

/** Pull JWT from Authorization header, httpOnly cookie, or ?token= query. */
function extractToken(req: Request): string | null {
  // 1. Authorization: Bearer <token>
  const fromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (fromHeader) return fromHeader;
  // 2. httpOnly cookie set by /auth/login
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  if (cookies?.access_token) return cookies.access_token;
  // 3. ?token= — only for media/download endpoints that can't send headers (<img>, <a>)
  const q = (req.query as Record<string, unknown>)?.token;
  if (typeof q === 'string' && q.length > 0) return q;
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = config.get('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET environment variable is required');
    super({
      jwtFromRequest: extractToken,
      secretOrKey: secret,
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, phone: true },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
