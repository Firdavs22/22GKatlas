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
import { CrmService } from './crm.service';
import { LeadDto } from './crm.dto';

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
    dto: plainToInstance(LeadDto, {
      parentName: field('parentName', 'Name'),
      phone: field('Phone'),
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
    const { dto, externalKey } = tildaFields(body);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length)
      throw new BadRequestException({
        message: 'Проверьте поля формы Tilda',
        fields: errors.map((e) => e.property),
      });
    await this.crm.create(dto, null, externalKey);
    // No contact data, internal IDs or credentials in the provider response.
    return 'ok';
  }
}
