import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

export interface AccessPayload { sub: string; type: 'access'; exp: number; }

export function assertAccessPayload(payload: unknown): asserts payload is AccessPayload {
  const p = payload as Partial<AccessPayload> | null;
  if (!p || p.type !== 'access' || typeof p.sub !== 'string' || !p.sub ||
      typeof p.exp !== 'number' || p.exp <= Date.now() / 1000) {
    throw new UnauthorizedException('Недействительный токен доступа');
  }
}

export function extractAccessToken(req: Request): string | null {
  const authorization = req.headers.authorization;
  // Do not fall back to cookies after an invalid explicit credential.
  if (authorization) return /^Bearer (\S+)$/i.exec(authorization)?.[1] || null;
  // Compatibility with native image/video players and mobile export links only.
  const path = (req.originalUrl || req.url || '').split('?')[0];
  if (req.method === 'GET' && (/^\/api\/files\/[^/]+$/.test(path) || path === '/api/me/export')) {
    if (typeof req.query.token === 'string') return req.query.token;
  }
  return req.cookies?.access_token || null;
}
