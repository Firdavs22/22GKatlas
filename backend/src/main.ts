// Must come BEFORE other imports — Sentry hooks into Node internals.
import './instrument';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { SentryExceptionFilter } from './common/sentry-exception.filter';
import { CsrfMiddleware } from './common/csrf.middleware';
import { NestExpressApplication } from '@nestjs/platform-express';
import { allowedOrigins } from './common/origins';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Default: direct clients. Compose enables trust for the single nginx hop.
  if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY.split(',').map(value => value.trim()));

  // Security headers (X-Frame-Options, X-Content-Type-Options, HSTS, etc.).
  // Disable contentSecurityPolicy here — the Next.js frontend sets its own.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Parse cookies (JWT может приходить из httpOnly cookie)
  app.use(cookieParser());
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: false, limit: '1mb' }));

  // CSRF — double-submit cookie. Issues XSRF-TOKEN cookie, requires header on mutating requests.
  app.use(new CsrfMiddleware().use);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new SentryExceptionFilter());

  app.enableCors({
    origin: allowedOrigins(),
    credentials: true,
  });

  const port = Number(process.env.PORT || 3001);
  await app.listen(port, process.env.HOST || '0.0.0.0');
  console.log(`Backend running on http://localhost:${port}/api`);
}
bootstrap();
