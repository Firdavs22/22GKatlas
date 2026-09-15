import { CsrfMiddleware } from './csrf.middleware';

describe('Cookie session CSRF', () => {
  const originalKey = process.env.JWT_SECRET;
  beforeAll(() => { process.env.JWT_SECRET = 'csrf-test-only'; });
  afterAll(() => { if (originalKey === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = originalKey; });
  function call(method: string, path: string, options: any = {}) {
    const req: any = { method, originalUrl: path, headers: {}, cookies: {}, ...options };
    const res: any = { cookie: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    new CsrfMiddleware().use(req, res, next);
    return { req, res, next };
  }
  it('issues a signed token that permits a same-origin mutation', () => {
    const csrf = call('GET', '/api/auth/csrf').req.cookies['XSRF-TOKEN'];
    const result = call('PUT', '/api/me', { cookies: { 'XSRF-TOKEN': csrf }, headers: { 'x-xsrf-token': csrf } });
    expect(result.next).toHaveBeenCalled();
  });
  it('rejects a cookie/header pair invented by a client', () => {
    const token = `${'a'.repeat(64)}.${'b'.repeat(64)}`;
    expect(call('PUT', '/api/me', { cookies: { 'XSRF-TOKEN': token }, headers: { 'x-xsrf-token': token } }).res.status).toHaveBeenCalledWith(403);
  });
  it.each(['/api/auth/refresh', '/api/auth/logout'])('requires CSRF for %s with cookie credentials', path => {
    expect(call('POST', path, { cookies: { refresh_token: 'secret' }, headers: { authorization: 'Bearer junk' } }).res.status).toHaveBeenCalledWith(403);
  });
  it('allows native body-token refresh', () => {
    expect(call('POST', '/api/auth/refresh', { body: { refreshToken: 'native-token' } }).next).toHaveBeenCalled();
  });
  it('rejects a foreign-origin login', () => {
    expect(call('POST', '/api/auth/login', { headers: { origin: 'https://foreign.invalid' } }).res.status).toHaveBeenCalledWith(403);
  });
});
