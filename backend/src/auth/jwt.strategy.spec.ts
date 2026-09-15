import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('API access tokens', () => {
  const user = { id: 'parent-1', role: 'parent', deletedAt: null, blockedAt: null };
  const prisma = { user: { findUnique: jest.fn() } };
  const strategy = new JwtStrategy({ get: () => 'test-only-secret' } as any, prisma as any);

  beforeEach(() => { prisma.user.findUnique.mockReset().mockResolvedValue(user); });

  it.each(['invite', 'reset', undefined])('rejects a token with purpose %s', async type => {
    await expect(strategy.validate({ sub: user.id, type } as any)).rejects.toThrow(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('uses current permissions from the database for an access token', async () => {
    const result = await strategy.validate({ sub: user.id, type: 'access', exp: Math.floor(Date.now() / 1000) + 60 } as any);
    expect(result).toEqual({ id: user.id, role: 'parent' });
  });

  it.each(['blockedAt', 'deletedAt'])('rejects an account with %s', async field => {
    prisma.user.findUnique.mockResolvedValue({ ...user, [field]: new Date() });
    await expect(strategy.validate({ sub: user.id, type: 'access', exp: Math.floor(Date.now() / 1000) + 60 } as any)).rejects.toThrow(UnauthorizedException);
  });
});
