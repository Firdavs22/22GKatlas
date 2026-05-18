import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';

/**
 * Catches anything not already a 4xx HttpException and reports to Sentry.
 * NestJS's BaseExceptionFilter handles the HTTP response — we just forward.
 */
@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('SentryExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const res = http.getResponse();
    const req = http.getRequest();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : 500;

    // Only report 5xx and unknown errors (4xx are usually user mistakes).
    if (!isHttp || status >= 500) {
      Sentry.withScope(scope => {
        if (req?.user) {
          scope.setUser({ id: req.user.id, username: req.user.email, role: req.user.role });
        }
        scope.setExtra('path', req?.originalUrl || req?.url);
        scope.setExtra('method', req?.method);
        Sentry.captureException(exception);
      });
      this.logger.error(`Unhandled ${status}: ${(exception as Error)?.message}`, (exception as Error)?.stack);
    }

    // Mimic Nest's default response shape
    const payload = isHttp
      ? (exception.getResponse() as Record<string, unknown>)
      : { statusCode: 500, message: 'Internal Server Error' };

    res.status(status).json(typeof payload === 'object' ? payload : { statusCode: status, message: payload });
  }
}
