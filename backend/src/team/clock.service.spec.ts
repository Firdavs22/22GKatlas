import { ClockService, workplaceAllows } from './clock.service';
import { ForbiddenException } from '@nestjs/common';

describe('Workplace clock security', () => {
  const saved = {
    enabled: process.env.TEAM_CLOCK_ENABLED,
    ranges: process.env.TEAM_WORKPLACE_CIDRS,
  };
  afterEach(() => {
    for (const [key, value] of Object.entries({
      TEAM_CLOCK_ENABLED: saved.enabled,
      TEAM_WORKPLACE_CIDRS: saved.ranges,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  it('allows only configured IPv4/IPv6 networks, including mapped proxy addresses', () => {
    process.env.TEAM_WORKPLACE_CIDRS = '203.0.113.7,2001:db8:1234::/64';
    expect(workplaceAllows('203.0.113.7')).toBe(true);
    expect(workplaceAllows('::ffff:203.0.113.7')).toBe(true);
    expect(workplaceAllows('2001:db8:1234::7')).toBe(true);
    expect(workplaceAllows('203.0.113.8')).toBe(false);
    expect(workplaceAllows('2001:db8:1235::7')).toBe(false);
    expect(workplaceAllows('203.0.113.7, 198.51.100.1')).toBe(false);
  });
  it.each([
    '',
    '0.0.0.0/0',
    '::/0',
    '203.0.113.7,invalid',
    '203.0.113.7/33',
    '203.0.113.7/32/1',
  ])('fails closed for unsafe or invalid configuration: %s', (ranges) => {
    process.env.TEAM_WORKPLACE_CIDRS = ranges;
    expect(workplaceAllows('203.0.113.7')).toBe(false);
  });
  it('rejects clock writes before accessing storage when disabled or outside the workplace', async () => {
    const transaction = jest.fn();
    const service = new ClockService({ $transaction: transaction } as any);
    const actor = { id: 'teacher', role: 'teacher' };
    process.env.TEAM_WORKPLACE_CIDRS = '203.0.113.7';
    process.env.TEAM_CLOCK_ENABLED = 'false';
    await expect(
      service.start(actor, '203.0.113.7', 'request'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    process.env.TEAM_CLOCK_ENABLED = 'true';
    await expect(
      service.start(actor, '198.51.100.8', 'request'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.stop(actor, '198.51.100.8', 'session'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.closeByManager(
        'other',
        actor,
        '203.0.113.7',
        'session',
        new Date().toISOString(),
        'reason',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction).not.toHaveBeenCalled();
  });
});
