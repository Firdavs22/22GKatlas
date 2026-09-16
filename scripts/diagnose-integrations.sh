#!/usr/bin/env bash
# Read-only report: no form submission, email delivery, or database changes.
set -euo pipefail
cd /opt/globoatlas
dcp() { docker compose -f docker-compose.yml -f docker-compose.prod.yml "$@"; }
printf 'Версия файлов на VPS: '
git log -1 --format='%h %s'
dcp ps

dcp exec -T backend node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const { smtpConfiguration, smtpFailure } = require('./dist/src/mail/smtp');
const deadline = setTimeout(() => {
  console.log('DIAGNOSTICS_TIMEOUT: отчет не завершился за 45 секунд');
  process.exit(1);
}, 45000);
const print = (section, value) => console.log(section + ' ' + JSON.stringify(value));
const settings = smtpConfiguration(key => process.env[key]);
print('CONFIG', {
  crmEnabled: process.env.CRM_ENABLED !== 'false',
  tildaTokenConfigured: (process.env.TILDA_WEBHOOK_TOKEN || '').length >= 32,
  smtpHost: /^[a-z0-9.-]+$/i.test(settings.host) ? settings.host : '(не задан или неверный формат)',
  smtpPort: settings.port,
  smtpSecure: settings.secure,
  smtpUserSet: !!settings.user,
  smtpPasswordSet: !!process.env.SMTP_PASS,
  smtpFromSet: !!settings.from,
  smtpFromMatchesLogin: (settings.from.match(/<([^<>]+)>/)?.[1] || settings.from).trim().toLowerCase() === settings.user.toLowerCase(),
  smtpIssues: settings.issues,
});
async function databaseReport() {
  const databaseUrl = new URL(process.env.DATABASE_URL);
  databaseUrl.searchParams.set('connect_timeout', '5');
  databaseUrl.searchParams.set('pool_timeout', '5');
  const db = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });
  try {
    const [all, open, tilda, recent, webhook, migrations] = await Promise.all([
      db.crmLead.count(),
      db.crmLead.count({ where: { state: 'open' } }),
      db.crmLead.count({ where: { source: 'Tilda' } }),
      db.crmLead.findMany({ where: { source: 'Tilda' }, orderBy: { createdAt: 'desc' }, take: 5, select: { createdAt: true, state: true } }),
      db.auditLog.findMany({ where: { path: { in: ['/crm/tilda', '/crm/tilda/'] } }, orderBy: { createdAt: 'desc' }, take: 10, select: { createdAt: true, status: true, durationMs: true } }),
      db.$queryRaw`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at DESC LIMIT 5`,
    ]);
    print('CRM', { all, open, tilda, recentTilda: recent });
    print('TILDA_REQUESTS', webhook);
    print('MIGRATIONS', migrations);
  } finally { await db.$disconnect(); }
}
async function smtpReport() {
  if (settings.issues.length) {
    print('SMTP', { ok: false, code: 'SMTP_CONFIG', issues: settings.issues });
    return;
  }
  const transport = nodemailer.createTransport(settings.options);
  try {
    await transport.verify();
    print('SMTP', { ok: true, message: 'Соединение, TLS и авторизация работают. Письмо не отправлялось; разрешение SMTP_FROM и доставку получателю нужно проверить приглашением.' });
  } catch (error) { print('SMTP', { ok: false, ...smtpFailure(error) }); }
  finally { transport.close(); }
}
Promise.allSettled([databaseReport(), smtpReport()]).then(results => {
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const code = result.reason?.code;
      print(i === 0 ? 'DATABASE_ERROR' : 'SMTP_ERROR', { code: typeof code === 'string' && /^P[0-9]{4}$/.test(code) ? code : 'REPORT_FAILED' });
    }
  });
}).finally(() => clearTimeout(deadline));
NODE

printf '\nСобытия интеграций за последние 30 минут (без адресов и секретов):\n'
dcp logs --since 30m --tail 1500 --no-color backend | awk '/MAIL_EVENT |TILDA_EVENT /' | tail -40
