import { TildaController, tildaFields } from './tilda.controller';
import { UnauthorizedException } from '@nestjs/common';
import { validate } from 'class-validator';

describe('Tilda webhook contract', () => {
  const saved = process.env.TILDA_WEBHOOK_TOKEN;
  const secret = 'test-only-tilda-secret-with-at-least-32-characters';
  afterEach(() => {
    if (saved === undefined) delete process.env.TILDA_WEBHOOK_TOKEN;
    else process.env.TILDA_WEBHOOK_TOKEN = saved;
  });
  it('authenticates Tilda verification without creating a lead', async () => {
    const create = jest.fn();
    const controller = new TildaController({ create } as any);
    process.env.TILDA_WEBHOOK_TOKEN = secret;
    await expect(
      controller.receive('Bearer wrong', { test: 'test' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(await controller.receive('Bearer ' + secret, { test: 'test' })).toBe(
      'ok',
    );
    expect(create).not.toHaveBeenCalled();
    delete process.env.TILDA_WEBHOOK_TOKEN;
    await expect(
      controller.receive('Bearer ' + secret, { test: 'test' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('maps form fields and UTM without retaining raw cookies or unknown fields', async () => {
    const { dto, externalKey } = tildaFields({
      tranid: '467251:8442970',
      Name: ' Родитель ',
      Phone: '8 (999) 123-45-67',
      Email: 'PARENT@example.invalid',
      childName: 'Ребёнок',
      COOKIES:
        'secret=private; TILDAUTM=utm_source%3Dtilda%7C%7C%7Cutm_campaign%3Dautumn',
      password: 'must-not-be-kept',
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto).toMatchObject({
      parentName: 'Родитель',
      email: 'parent@example.invalid',
      childName: 'Ребёнок',
      utmSource: 'tilda',
      utmCampaign: 'autumn',
      source: 'Tilda',
    });
    expect(JSON.stringify(dto)).not.toMatch(
      /secret|private|password|must-not-be-kept/,
    );
    expect(externalKey).toBe(
      tildaFields({ tranid: '467251:8442970' }).externalKey,
    );
    expect(externalKey).not.toBe(
      tildaFields({ tranid: '467251:8442971' }).externalKey,
    );
  });
  it('rejects missing submission IDs, structured values and incomplete contacts', async () => {
    expect(() => tildaFields({ Name: 'A' })).toThrow();
    expect(() => tildaFields({ tranid: '1', Phone: ['spoofed'] })).toThrow();
    process.env.TILDA_WEBHOOK_TOKEN = secret;
    const create = jest.fn();
    await expect(
      new TildaController({ create } as any).receive('Bearer ' + secret, {
        tranid: '1',
        Phone: '89991234567',
      }),
    ).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
});
