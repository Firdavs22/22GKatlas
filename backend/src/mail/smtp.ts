import type SMTPTransport from 'nodemailer/lib/smtp-transport';

export function smtpConfiguration(get: (key: string) => string | undefined) {
  const host = (get('SMTP_HOST') || '').trim();
  const user = (get('SMTP_USER') || '').trim();
  const pass = get('SMTP_PASS') || '';
  const port = Number(get('SMTP_PORT') || 465);
  const setting = (get('SMTP_SECURE') || '').trim().toLowerCase();
  const secure = setting ? setting === 'true' : port === 465;
  const from = (get('SMTP_FROM') || '').trim() || user;
  const issues: string[] = [];
  if (!host) issues.push('Не задан SMTP_HOST');
  if (!user) issues.push('Не задан SMTP_USER');
  if (!pass) issues.push('Не задан SMTP_PASS');
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    issues.push('Некорректный SMTP_PORT');
  if (setting && !['true', 'false'].includes(setting))
    issues.push('SMTP_SECURE должен быть true или false');
  if (port === 465 && !secure)
    issues.push('Для порта 465 задайте SMTP_SECURE=true');
  if (port === 587 && secure)
    issues.push('Для порта 587 задайте SMTP_SECURE=false (STARTTLS)');
  const options: SMTPTransport.Options = {
    host,
    port,
    secure,
    auth: { user, pass },
    requireTLS: !secure,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    dnsTimeout: 10000,
    logger: false,
    debug: false,
  };
  return { host, port, secure, user, from, issues, options };
}

export type SmtpFailure = { code: string; responseCode?: number; hint: string };
export class MailDeliveryError extends Error {
  constructor(readonly failure: SmtpFailure) {
    super(failure.hint);
    this.name = 'MailDeliveryError';
  }
}

// Only fixed codes and advice leave this function. Provider responses may contain
// recipient addresses, so neither the raw response nor the raw error is logged.
export function smtpFailure(error: unknown): SmtpFailure {
  if (error instanceof MailDeliveryError) return error.failure;
  const err = (error || {}) as {
    code?: string;
    responseCode?: number;
    message?: string;
  };
  const responseCode =
    Number.isInteger(err.responseCode) &&
    err.responseCode! >= 400 &&
    err.responseCode! <= 599
      ? err.responseCode
      : undefined;
  if (err.code === 'EAUTH' || [530, 534, 535].includes(responseCode || 0))
    return {
      code: 'SMTP_AUTH',
      responseCode,
      hint: 'SMTP отклонил авторизацию. Для Яндекса проверьте полный адрес в SMTP_USER, пароль приложения Почты в SMTP_PASS и доступ почтовых клиентов.',
    };
  if (
    [
      'ETIMEDOUT',
      'ECONNREFUSED',
      'EHOSTUNREACH',
      'ENETUNREACH',
      'ECONNRESET',
      'ESOCKET',
      'ECONNECTION',
      'EDNS',
      'ENOTFOUND',
      'EAI_AGAIN',
    ].includes(err.code || '') &&
    !/certificate|ssl|tls|wrong version/i.test(err.message || '')
  )
    return {
      code: 'SMTP_CONNECTION',
      responseCode,
      hint: 'VPS не смог соединиться с SMTP. Проверьте SMTP_HOST, порт, режим шифрования и разрешение исходящих SMTP-соединений у провайдера VPS.',
    };
  if (
    err.code === 'ETLS' ||
    /certificate|ssl|tls|wrong version/i.test(err.message || '')
  )
    return {
      code: 'SMTP_TLS',
      responseCode,
      hint: 'Ошибка защищенного SMTP-соединения. Для Яндекса используйте smtp.yandex.ru, порт 465 и SMTP_SECURE=true; проверьте дату на VPS.',
    };
  if (err.code === 'EENVELOPE' || [550, 553].includes(responseCode || 0))
    return {
      code: 'SMTP_ADDRESS',
      responseCode,
      hint: 'SMTP отклонил отправителя или получателя. Проверьте email родителя и адрес SMTP_FROM: у Яндекса он должен принадлежать авторизованному ящику.',
    };
  if (responseCode && responseCode < 500)
    return {
      code: 'SMTP_TEMPORARY',
      responseCode,
      hint: 'Почтовый сервер временно отказал в отправке. Проверьте ограничения почтового ящика и повторите позже.',
    };
  return {
    code: 'SMTP_REJECTED',
    responseCode,
    hint: 'Почтовый сервер не подтвердил отправку. Запустите диагностику интеграций на VPS и проверьте ограничения почтового ящика.',
  };
}
