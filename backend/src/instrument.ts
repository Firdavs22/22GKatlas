/**
 * Sentry initialization — MUST be the first import in main.ts so that all
 * subsequent modules are auto-instrumented (express, prisma, http, etc.).
 *
 * If SENTRY_DSN is not set, Sentry is a no-op — safe for dev.
 */
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const dsn = process.env.SENTRY_DSN || process.env.SENTRY_DSN_BACKEND;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'production',
    release: process.env.APP_VERSION || undefined,
    integrations: [nodeProfilingIntegration()],
    // Performance — keep light for a kindergarten-scale app.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_RATE ?? 0.05),
    profilesSampleRate: 0.05,
    // Drop noisy noise we can't act on.
    ignoreErrors: [
      'ThrottlerException',
      'UnauthorizedException',
      'ForbiddenException',
      'NotFoundException',
    ],
  });
}

export { Sentry };
