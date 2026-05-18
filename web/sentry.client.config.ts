import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.05,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.5,
    ignoreErrors: [
      // Browser noise we can't act on
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      // Auth redirects throwing on already-unmounted components
      'AbortError: The user aborted a request.',
    ],
  });
}
