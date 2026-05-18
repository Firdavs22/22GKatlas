import { withSentryConfig } from '@sentry/nextjs';

/** @type {import("next").NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  // TypeScript errors MUST be caught at build time for production safety
  // If build fails, fix the TS errors before deploying
};

// Sentry: only wraps when NEXT_PUBLIC_SENTRY_DSN is set; otherwise no-op.
const sentryConfig = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      silent: true,
      // No source-map upload here — set SENTRY_AUTH_TOKEN in CI when you want it.
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      hideSourceMaps: true,
      disableLogger: true,
    })
  : nextConfig;

export default sentryConfig;
