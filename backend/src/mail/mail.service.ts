import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailDeliveryError, smtpConfiguration, smtpFailure } from './smtp';

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
 *  - SMTP_HOST не задан → письмо не отправляется; содержимое и ссылки не логируются
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
  private readonly configurationIssues: string[];

  constructor(private config: ConfigService) {
    const settings = smtpConfiguration((key) => this.config.get<string>(key));
    this.enabled = !!settings.host;
    this.from = settings.from;
    this.configurationIssues = settings.issues;

    if (this.enabled) {
      if (!settings.issues.length)
        this.transporter = nodemailer.createTransport(settings.options);
      this.logger.log(
        'MAIL_EVENT ' +
          JSON.stringify({
            event: settings.issues.length
              ? 'configuration_error'
              : 'configured',
            port: settings.port,
            secure: settings.secure,
            issues: settings.issues,
          }),
      );
    } else {
      this.logger.warn(
        'MAIL_EVENT {"event":"disabled","code":"SMTP_NOT_CONFIGURED"}',
      );
    }
  }

  async send({
    to,
    subject,
    html,
    text,
  }: SendArgs): Promise<{ sent: boolean; preview?: string }> {
    if (!this.enabled) {
      this.logger.warn(
        'MAIL_EVENT {"event":"not_sent","code":"SMTP_NOT_CONFIGURED"}',
      );
      return { sent: false };
    }
    if (this.configurationIssues.length || !this.transporter)
      throw new MailDeliveryError({
        code: 'SMTP_CONFIG',
        hint: this.configurationIssues.join('. ') || 'Проверьте настройки SMTP',
      });

    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
        text,
      });
      this.logger.log('MAIL_EVENT {"event":"accepted_by_smtp"}');
      return { sent: true };
    } catch (err) {
      const failure = smtpFailure(err);
      this.logger.error(
        'MAIL_EVENT ' + JSON.stringify({ event: 'failed', ...failure }),
      );
      throw new MailDeliveryError(failure);
    }
  }
}
