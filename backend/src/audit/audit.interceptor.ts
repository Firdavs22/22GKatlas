import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap, catchError } from 'rxjs';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const MAX_BODY_BYTES = 4096;
const SENSITIVE_KEYS = new Set([
  'password', 'oldPassword', 'newPassword', 'token', 'refreshToken',
  'inviteToken', 'consent',
]);

// Paths we don't want to log (too noisy or contain only secrets).
const SKIP_PATHS = [
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot',
  '/auth/reset',
];

function sanitize(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitize);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k)) {
      out[k] = '***';
    } else {
      out[k] = typeof v === 'object' ? sanitize(v) : v;
    }
  }
  return out;
}

function truncate(obj: unknown): unknown {
  const json = JSON.stringify(obj);
  if (json.length <= MAX_BODY_BYTES) return obj;
  return { _truncated: true, _bytes: json.length, preview: json.slice(0, MAX_BODY_BYTES - 64) };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request & { user?: { id: string; role: string } }>();
    const res = ctx.switchToHttp().getResponse();
    const method = req.method;
    const path = req.originalUrl?.split('?')[0] || req.url || '';

    // Only mutating requests, only API routes, not the noisy ones.
    if (!MUTATING.has(method)) return next.handle();
    if (!path.startsWith('/api/')) return next.handle();
    if (SKIP_PATHS.some(p => path === `/api${p}` || path.startsWith(`/api${p}?`))) {
      return next.handle();
    }

    const start = Date.now();
    const cleanPath = path.replace(/^\/api/, '');
    const sanitizedBody = truncate(sanitize(req.body));
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket?.remoteAddress
      || null;
    const userAgent = (req.headers['user-agent'] as string)?.slice(0, 300) || null;

    const writeLog = (status: number) => {
      const actor = req.user;
      this.prisma.auditLog.create({
        data: {
          actorId: actor?.id || null,
          actorRole: actor?.role || null,
          method,
          path: cleanPath,
          status,
          ip,
          userAgent,
          body: (sanitizedBody as object) ?? undefined,
          durationMs: Date.now() - start,
        },
      }).catch(e => this.logger.warn(`audit log failed: ${(e as Error).message}`));
    };

    return next.handle().pipe(
      tap(() => writeLog(res.statusCode || 200)),
      catchError((err) => {
        writeLog(err?.status || 500);
        throw err;
      }),
    );
  }
}
