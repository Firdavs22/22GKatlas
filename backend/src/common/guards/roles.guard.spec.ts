import { RolesGuard } from './roles.guard';

describe('Director permissions', () => {
  const allowed = (role: string, required: string[]) =>
    new RolesGuard({ getAllAndOverride: () => required } as any).canActivate({
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    } as any);
  it('inherits daily administration and explicitly granted staff management', () => {
    expect(allowed('director', ['admin'])).toBe(true);
    expect(allowed('director', ['director', 'superadmin'])).toBe(true);
    expect(allowed('admin', ['director', 'superadmin'])).toBe(false);
  });
  it('keeps owner permissions restricted', () => {
    expect(allowed('director', ['superadmin'])).toBe(false);
    expect(allowed('teacher', ['admin'])).toBe(false);
    expect(allowed('superadmin', ['superadmin'])).toBe(true);
  });
});
