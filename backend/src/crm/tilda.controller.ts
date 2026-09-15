import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { createHash, timingSafeEqual } from 'crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Feature, FeatureGuard } from '../features/features.module';
import { CrmService, normalizePhone } from './crm.service';
import { LeadDto } from './crm.dto';
import type { IntakeDetails } from './intake-details';

export function tildaFields(body: Record<string, unknown>) {
  const fields = new Map(
    Object.entries(body).map(([k, v]) => [k.toLowerCase(), v]),
  );
  const field = (...names: string[]) => {
    for (const name of names) {
      const value = fields.get(name.toLowerCase());
      if (value === undefined) continue;
      if (typeof value !== 'string')
        throw new BadRequestException('Поля формы должны быть строками');
      if (value.trim()) return value.trim();
    }
    return '';
  };
  const id = field('tranid');
  if (!id || id.length > 120)
    throw new BadRequestException('Нужен tranid заявки Tilda');
  const shortField = (limit: number, ...names: string[]) => {
    const value = field(...names);
    if (value.length > limit)
      throw new BadRequestException('Слишком длинное поле ' + names[0]);
    return value;
  };
  const methods: Record<string, IntakeDetails['contactMethod']> = {
    phone: 'phone',
    telephone: 'phone',
    телефон: 'phone',
    telegram: 'telegram',
    tg: 'telegram',
    телеграм: 'telegram',
    vk: 'vk',
    вк: 'vk',
    вконтакте: 'vk',
    max: 'max',
    макс: 'max',
  };
  const method =
    shortField(40, 'contactMethod', 'contact_method').toLowerCase() || 'phone';
  const contactMethod = methods[method];
  if (!contactMethod)
    throw new BadRequestException('Способ связи: phone, telegram, vk или max');
  const rawPhone = shortField(300, 'Phone');
  const contactValue =
    shortField(
      300,
      'contactValue',
      'contact_value',
      ...(contactMethod !== 'phone' ? [contactMethod] : []),
    ) || rawPhone;
  if (!contactValue)
    throw new BadRequestException(
      'Укажите телефон или контакт выбранного мессенджера',
    );
  const asPhone = (value: string) => {
    if (!/^[+\d()\s-]+$/.test(value))
      throw new BadRequestException('Укажите корректный номер телефона');
    return normalizePhone(value);
  };
  let phone = '';
  if (contactMethod === 'phone') phone = asPhone(rawPhone || contactValue);
  else {
    // Messenger forms may put a nickname into the same field normally called Phone.
    // Only a real +7/8 number becomes the parent's telephone.
    try {
      phone = asPhone(rawPhone || contactValue);
    } catch {
      /* nickname or profile link */
    }
  }
  const consent = (raw: string): boolean | null => {
    if (['yes', 'true', '1', 'on', 'да'].includes(raw.toLowerCase()))
      return true;
    if (['no', 'false', '0', 'off', 'нет'].includes(raw.toLowerCase()))
      return false;
    return null;
  };
  const dataConsentRaw = shortField(1000, 'dataConsent', 'data_consent');
  const marketingConsentRaw = shortField(
    1000,
    'marketingConsent',
    'marketing_consent',
  );
  const intakeDetails: IntakeDetails = {
    provider: 'tilda',
    childAge: shortField(80, 'childAge', 'child_age', 'Age'),
    contactMethod,
    contactValue,
    visitDate: shortField(80, 'visitDate', 'visit_date', 'Date'),
    dataConsent: consent(dataConsentRaw),
    dataConsentRaw,
    marketingConsent: consent(marketingConsentRaw),
    marketingConsentRaw,
    formId: shortField(120, 'formid'),
  };
  const cookies = field('COOKIES').slice(0, 16000);
  const rawUtm =
    cookies
      .split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('TILDAUTM='))
      ?.slice(9) || '';
  let utm = new URLSearchParams();
  try {
    utm = new URLSearchParams(
      decodeURIComponent(rawUtm).replace(/\|\|\|?/g, '&'),
    );
  } catch {
    /* optional tracking data */
  }
  return {
    externalKey: 'tilda:' + createHash('sha256').update(id).digest('hex'),
    intakeDetails,
    dto: plainToInstance(LeadDto, {
      parentName: field('parentName', 'Name'),
      phone,
      email: field('Email') || undefined,
      childName: field('childName'),
      birthDate: field('birthDate') || undefined,
      direction: field('direction'),
      priority: 'normal',
      source: 'Tilda',
      utmSource: field('utm_source') || utm.get('utm_source') || '',
      utmMedium: field('utm_medium') || utm.get('utm_medium') || '',
      utmCampaign: field('utm_campaign') || utm.get('utm_campaign') || '',
      notes: field('Comments', 'notes'),
      nextAction: 'Связаться по заявке с сайта',
    }),
  };
}

@Controller('crm/tilda')
@Feature('crm')
@UseGuards(FeatureGuard)
export class TildaController {
  constructor(private crm: CrmService) {}
  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async receive(
    @Headers('authorization') authorization: string,
    @Body() body: Record<string, unknown>,
  ) {
    const expected = process.env.TILDA_WEBHOOK_TOKEN || '';
    const supplied = /^Bearer (\S+)$/i.exec(authorization || '')?.[1] || '';
    const digest = (value: string) =>
      createHash('sha256').update(value).digest();
    if (
      expected.length < 32 ||
      !timingSafeEqual(digest(expected), digest(supplied))
    )
      throw new UnauthorizedException();
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new BadRequestException('Нужна форма Tilda');
    if (
      body.test === 'test' &&
      Object.keys(body).every((key) => key === 'test')
    )
      return 'ok';
    const { dto, externalKey, intakeDetails } = tildaFields(body);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length)
      throw new BadRequestException({
        message: 'Проверьте поля формы Tilda',
        fields: errors.map((e) => e.property),
      });
    await this.crm.create(dto, null, externalKey, intakeDetails);
    // No contact data, internal IDs or credentials in the provider response.
    return 'ok';
  }
}
