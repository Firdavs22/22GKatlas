import { Injectable, NestMiddleware } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { allowedOrigins } from './origins';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const PUBLIC_AUTH = new Set(['/api/auth/login', '/api/auth/forgot', '/api/auth/reset', '/api/auth/invite/accept']);

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use = (req: Request, res: Response, next: NextFunction): void => {
    const key = process.env.JWT_SECRET;
    if (!key) { res.status(503).json({ message: 'Сервис авторизации не настроен' }); return; }
    const sign = (nonce: string) => createHmac('sha256', key).update(`csrf:${nonce}`).digest('hex');
    const received = req.cookies?.['XSRF-TOKEN'];
    const parts = typeof received === 'string' ? received.split('.') : [];
    const validCookie = parts.length === 2 && /^[a-f0-9]{64}$/.test(parts[0]) && /^[a-f0-9]{64}$/.test(parts[1]) &&
      timingSafeEqual(Buffer.from(sign(parts[0]), 'hex'), Buffer.from(parts[1], 'hex'));
    let csrfToken = received;
    if (!validCookie) {
      const nonce = randomBytes(32).toString('hex');
      csrfToken = `${nonce}.${sign(nonce)}`;
      res.cookie('XSRF-TOKEN', csrfToken, {
        httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
        path: '/', maxAge: 30 * 24 * 60 * 60 * 1000,
      });
      req.cookies = { ...req.cookies, 'XSRF-TOKEN': csrfToken };
    }
    if (!MUTATING.has(req.method)) { next(); return; }
    const deny = () => { res.status(403).json({ statusCode: 403, code: 'CSRF_INVALID', message: 'Недействительный CSRF-токен или источник запроса' }); };
    const origin = req.headers.origin;
    if (origin && !allowedOrigins().includes(origin)) { deny(); return; }
    const path = (req.originalUrl || req.path).split('?')[0];
    if (PUBLIC_AUTH.has(path)) { next(); return; }
    const tokenRoute = path === '/api/auth/refresh' || path === '/api/auth/logout';
    if (tokenRoute && typeof req.body?.refreshToken === 'string' && req.body.refreshToken.length >= 8) { next(); return; }
    if (!tokenRoute && /^Bearer \S+$/i.test(req.headers.authorization || '')) { next(); return; }
    if (validCookie && req.headers['x-xsrf-token'] === csrfToken) { next(); return; }
    deny();
  };
}
