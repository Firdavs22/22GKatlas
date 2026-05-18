import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import * as crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const TOKEN_COOKIE = 'XSRF-TOKEN';
const HEADER_NAME = 'x-xsrf-token';
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Routes that intentionally bypass CSRF (no cookie auth → no risk):
//   - /auth/login: user is anonymous, no cookie yet.
//   - /auth/forgot, /reset: same.
//   - Anything with Bearer token (mobile / scripts) — token presence implies non-browser.
const PATH_BYPASS = [
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/forgot',
  '/api/auth/reset',
  '/api/auth/invite/accept',
];

/**
 * Double-submit cookie CSRF.
 *
 *   1. On every request, ensures an XSRF-TOKEN cookie exists (readable from JS).
 *   2. On mutating requests authenticated via cookie, the same value must be sent
 *      back in the X-XSRF-TOKEN header. Attackers can set cookies but cannot read
 *      them cross-origin, so they can't forge the header.
 *   3. Bearer-token requests (mobile, scripts) bypass — they're not browser cookies.
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use = (req: Request, res: Response, next: NextFunction): void => {
    // Issue token if missing
    let token = (req as Request & { cookies?: Record<string, string> }).cookies?.[TOKEN_COOKIE];
    if (!token) {
      token = crypto.randomBytes(32).toString('hex');
      res.cookie(TOKEN_COOKIE, token, {
        httpOnly: false, // JS must read it to put in header
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 30,
      });
    }

    if (!MUTATING.has(req.method)) return next();

    const path = req.originalUrl?.split('?')[0] || req.path;
    if (PATH_BYPASS.some(p => path === p || path.startsWith(`${p}?`))) return next();

    // Bearer auth → no CSRF needed (token can't be sent cross-origin without explicit code).
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) return next();

    // Cookie-authenticated browser request: require matching header.
    const headerToken = req.headers[HEADER_NAME];
    if (typeof headerToken === 'string' && headerToken === token) return next();

    throw new ForbiddenException('CSRF token missing or invalid');
  };
}
