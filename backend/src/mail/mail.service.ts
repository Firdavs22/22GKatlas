import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Универсальный SMTP-отправитель.
 *
 * Поведение зависит от ENV:
 *  - SMTP_HOST задан → пытается реально отправлять через указанный SMTP
 *  - SMTP_HOST не задан → DEV-режим: письмо логируется в консоль, реальная отправка не происходит
 *
 * Когда настроишь Yandex 360 — заполни в .env:
 *   SMTP_HOST=smtp.yandex.ru
 *   SMTP_PORT=465
 *   SMTP_SECURE=true
 *   SMTP_USER=noreply@yourdomain.ru
 *   SMTP_PASS=<пароль приложения из Яндекс ID>
 *   SMTP_FROM="ГлобоАтлас <noreply@yourdomain.ru>"
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly from: string;
  private readonly enabled: boolean;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    this.enabled = !!host;
    this.from = this.config.get<string>('SMTP_FROM') || 'GloboAtlas <noreply@localhost>';

    if (this.enabled) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.config.get<string>('SMTP_PORT') || 465),
        secure: this.config.get<string>('SMTP_SECURE') !== 'false',
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });
      this.logger.log(`SMTP включён: ${host}`);
    } else {
      this.logger.warn(
        'SMTP не настроен (SMTP_HOST не задан). Письма будут логироваться в консоль вместо реальной отправки.',
      );
    }
  }

  async send({ to, subject, html, text }: SendArgs): Promise<{ sent: boolean; preview?: string }> {
    if (!this.enabled || !this.transporter) {
      // Dev-режим: показываем письмо в логе, ничего не отправляем
      const preview =
        `\n──────── EMAIL (DEV, не отправлено) ────────\n` +
        `To: ${to}\nSubject: ${subject}\n` +
        `Text: ${text || '(нет)'}\n` +
        `─────────────────────────────────────────────\n`;
      this.logger.log(preview);
      return { sent: false, preview };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
        text,
      });
      this.logger.log(`Письмо отправлено: ${info.messageId} → ${to}`);
      return { sent: true };
    } catch (err) {
      this.logger.error(`Ошибка SMTP: ${(err as Error).message}`);
      throw err;
    }
  }
}
