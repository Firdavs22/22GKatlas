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
      childName: 'Ребенок',
      COOKIES:
        'secret=private; TILDAUTM=utm_source%3Dtilda%7C%7C%7Cutm_campaign%3Dautumn',
      password: 'must-not-be-kept',
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto).toMatchObject({
      parentName: 'Родитель',
      email: 'parent@example.invalid',
      childName: 'Ребенок',
      utmSource: 'tilda',
      utmCampaign: 'autumn',
      source: 'Tilda',
    });
    expect(JSON.stringify(dto)).not.toMatch(
      /secret|private|password|must-not-be-kept/,
    );
    expect(externalKey).toBe(
      tildaFields({ tranid: '467251:8442970', Phone: '89991234567' })
        .externalKey,
    );
    expect(externalKey).not.toBe(
      tildaFields({ tranid: '467251:8442971', Phone: '89991234567' })
        .externalKey,
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
  it.each(['telegram', 'vk', 'max'])(
    'accepts a %s nickname without inventing a phone or birth date',
    async (contactMethod) => {
      const { dto, intakeDetails } = tildaFields({
        tranid: 'form:messenger',
        Name: 'Родитель',
        childAge: '2 года 8 месяцев',
        contactMethod,
        contactValue: '@parent79991234567',
        visitDate: '25.09.2026',
        dataConsent: 'yes',
        marketingConsent: 'no',
      });
      expect(await validate(dto)).toEqual([]);
      expect(dto.phone).toBe('');
      expect(dto.birthDate).toBeUndefined();
      expect(intakeDetails).toMatchObject({
        childAge: '2 года 8 месяцев',
        contactMethod,
        contactValue: '@parent79991234567',
        visitDate: '25.09.2026',
        dataConsent: true,
        marketingConsent: false,
      });
    },
  );
  it('accepts messenger phone numbers and preserves a nickname sent in the Phone field', () => {
    const form = {
      tranid: 'form:mixed',
      Name: 'Родитель',
      contactMethod: 'Telegram',
    };
    expect(
      tildaFields({ ...form, contactValue: '8 (999) 123-45-67' }).dto.phone,
    ).toBe('+79991234567');
    const nickname = tildaFields({ ...form, Phone: '@parent' });
    expect(nickname.dto.phone).toBe('');
    expect(nickname.intakeDetails.contactValue).toBe('@parent');
    expect(() => tildaFields({ ...form, contactValue: '' })).toThrow();
    expect(() =>
      tildaFields({ ...form, contactMethod: 'phone', contactValue: '@parent' }),
    ).toThrow();
  });
  it('does not infer consent from missing, arbitrary, or unrelated checkboxes', () => {
    const form = { tranid: 'form:consent', Phone: '89991234567' };
    expect(
      tildaFields({ ...form, Checkbox: 'yes' }).intakeDetails,
    ).toMatchObject({ dataConsent: null, marketingConsent: null });
    expect(
      tildaFields({
        ...form,
        dataConsent: 'Неизвестное значение',
        marketingConsent: 'false',
      }).intakeDetails,
    ).toMatchObject({
      dataConsent: null,
      dataConsentRaw: 'Неизвестное значение',
      marketingConsent: false,
    });
    expect(() => tildaFields({ ...form, childAge: 'a'.repeat(81) })).toThrow();
  });
  it.each([
    ['phone', '+7 (999) 123-45-67', 'phone', '+79991234567'],
    ['telegram', '@test_parent', 'telegram', ''],
    ['vk', 'https://vk.com/test_parent', 'vk', ''],
    ['max_messenger', '8 (999) 123-45-67', 'max', '+79991234567'],
  ])(
    'accepts the published form fields for %s',
    async (method, contact, normalizedMethod, phone) => {
      const payload = {
        tranid: 'published:123',
        formid: 'form908246677',
        name: 'Тест',
        input: '2',
        'messenger-type': method,
        'messenger-id': contact,
        Date: '20.09.2026',
        Checkbox: 'yes',
        'Checkbox 2': 'no',
      };
      const { dto, intakeDetails, externalKey } = tildaFields(payload);
      expect(await validate(dto)).toEqual([]);
      expect(dto.phone).toBe(phone);
      expect(dto.birthDate).toBeUndefined();
      expect(intakeDetails).toMatchObject({
        contactMethod: normalizedMethod,
        contactValue: contact,
        childAge: '2',
        visitDate: '20.09.2026',
        dataConsent: true,
        marketingConsent: false,
      });
      process.env.TILDA_WEBHOOK_TOKEN = secret;
      const create = jest.fn();
      expect(
        await new TildaController({ create } as any).receive(
          'Bearer ' + secret,
          payload,
        ),
      ).toBe('ok');
      expect(create).toHaveBeenCalledWith(
        dto,
        null,
        externalKey,
        intakeDetails,
      );
      expect(
        tildaFields({ ...payload, 'messenger-id': contact + ' ' }).externalKey,
      ).toBe(externalKey);
    },
  );
  it('recognizes the verified popup labels without assigning consent to unrelated forms', () => {
    const payload = {
      tranid: 'popup:1',
      formid: '1000686846',
      Name: 'Тест',
      'messenger-type': 'telegram',
      'messenger-id': '@test',
      'ВОЗРАСТ РЕБЕНКА': '3',
      'ДАТА ПОСЕЩЕНИЯ': '20.09.2026',
      Checkbox: 'yes',
      Checkbox_2: 'yes',
    };
    expect(tildaFields(payload).intakeDetails).toMatchObject({
      childAge: '3',
      visitDate: '20.09.2026',
      dataConsent: true,
      marketingConsent: true,
    });
    const unknown = tildaFields({
      ...payload,
      formid: 'other',
      input: '2',
      'ВОЗРАСТ РЕБЕНКА': '',
    }).intakeDetails;
    expect(unknown).toMatchObject({
      childAge: '',
      dataConsent: null,
      marketingConsent: null,
    });
    expect(
      tildaFields({ ...payload, Checkbox_2: '' }).intakeDetails
        .marketingConsent,
    ).toBeNull();
  });
});
