import { firstValueFrom, of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';

describe('Tilda audit privacy', () => {
  it.each(['/api/crm/tilda', '/api/CRM/TILDA/'])(
    'records delivery status without raw form cookies or unrecognized fields: %s',
    async (originalUrl) => {
      const create = jest.fn().mockResolvedValue({});
      const interceptor = new AuditInterceptor({ auditLog: { create } } as any);
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            originalUrl,
            headers: {},
            ip: '127.0.0.1',
            body: { COOKIES: 'session=private', unrecognized: 'secret' },
          }),
          getResponse: () => ({ statusCode: 200 }),
        }),
      };
      await firstValueFrom(
        interceptor.intercept(context as any, { handle: () => of('ok') }),
      );
      expect(create.mock.calls[0][0].data).toMatchObject({
        status: 200,
        body: undefined,
        ip: '127.0.0.1',
      });
      expect(JSON.stringify(create.mock.calls)).not.toMatch(
        /private|secret|COOKIES/,
      );
    },
  );
});
