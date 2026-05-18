// Must come BEFORE other imports — Sentry hooks into Node internals.
import './instrument';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { SentryExceptionFilter } from './common/sentry-exception.filter';
import { CsrfMiddleware } from './common/csrf.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : [
          'http://localhost:3000',
          'http://localhost:8080',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:8080',
        ],
    credentials: true,
  });

  await app.listen(3001, '0.0.0.0');
  console.log('Backend running on http://localhost:3001/api');
}
bootstrap();
