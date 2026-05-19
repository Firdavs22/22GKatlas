/**
 * Email templates.
 * HTML keeps inline styles (мобильные клиенты часто не поддерживают <style>).
 * Палитра соответствует прототипу: #0F5192 (brand), #F8F4ED (background).
 */

const BRAND = '#0F5192';
const BRAND_PALE = '#E8EEF5';
const FOREGROUND = '#1B1F2A';
const MUTED = '#64748B';

function shell(title: string, body: string): string {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F8F4ED;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${FOREGROUND};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8F4ED;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <tr>
            <td style="padding:32px 32px 24px 32px;border-bottom:1px solid #F1F5F9;">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.1;color:${FOREGROUND};">
                Глобо<em>Атлас</em>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">${body}</td>
          </tr>
          <tr>
            <td style="padding:20px 32px 32px 32px;border-top:1px solid #F1F5F9;color:${MUTED};font-size:12px;line-height:1.6;">
              Это автоматическое письмо от системы ГлобоАтлас. Если вы не ожидали его — просто проигнорируйте.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface ParentInviteVars {
  parentName: string;
  childName?: string;
  inviteUrl: string;
}

export function parentInvite(vars: ParentInviteVars): { subject: string; html: string; text: string } {
  const greeting = vars.parentName ? `Здравствуйте, ${vars.parentName}!` : 'Здравствуйте!';
  const childPart = vars.childName
    ? `Для вашего ребёнка <strong>${escapeHtml(vars.childName)}</strong> создан личный кабинет в нашей системе.`
    : 'Для вас создан личный кабинет в нашей системе.';

  const subject = `Приглашение в личный кабинет ГлобоАтлас`;

  const body = `
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;margin-bottom:16px;">
      ${escapeHtml(greeting)}
    </div>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:${FOREGROUND};">
      ${childPart}
    </p>
    <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:${FOREGROUND};">
      Чтобы получить доступ — нажмите на кнопку ниже и создайте пароль. После этого вы сможете видеть прогресс ребёнка,
      получать новости группы и общаться с педагогом.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td style="border-radius:999px;background:${BRAND};">
          <a href="${vars.inviteUrl}" target="_blank"
             style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;">
            Войти в личный кабинет
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px 0;font-size:12px;color:${MUTED};line-height:1.6;">
      Если кнопка не работает — скопируйте ссылку в браузер:
    </p>
    <div style="padding:12px;background:${BRAND_PALE};border-radius:12px;font-family:'Courier New',monospace;font-size:12px;color:${BRAND};word-break:break-all;">
      ${vars.inviteUrl}
    </div>
    <p style="margin:24px 0 0 0;font-size:12px;color:${MUTED};line-height:1.6;">
      Ссылка действует 30 дней.
    </p>
  `;

  const text =
    `${greeting}\n\n` +
    `${vars.childName ? `Для вашего ребёнка ${vars.childName} создан личный кабинет.` : 'Для вас создан личный кабинет.'}\n\n` +
    `Откройте ссылку чтобы создать пароль:\n${vars.inviteUrl}\n\n` +
    `Ссылка действует 30 дней.\n\nГлобоАтлас`;

  return { subject, html: shell(subject, body), text };
}

const ROLE_LABEL_RU: Record<string, string> = {
  teacher: 'педагога',
  psychologist: 'психолога',
  pediatrician: 'педиатра',
  admin: 'администратора',
};

export interface StaffInviteVars {
  name: string;
  role: string;          // 'teacher' | 'psychologist' | 'pediatrician' | 'admin'
  inviteUrl: string;
  isResend?: boolean;    // true = был сброс пароля, false = первое приглашение
}

export function staffInvite(vars: StaffInviteVars): { subject: string; html: string; text: string } {
  const roleRu = ROLE_LABEL_RU[vars.role] || 'сотрудника';
  const subject = vars.isResend
    ? 'Сброс пароля в личном кабинете ГлобоАтлас'
    : `Приглашение в команду ГлобоАтлас (${roleRu})`;

  const greeting = vars.name ? `Здравствуйте, ${escapeHtml(vars.name)}!` : 'Здравствуйте!';

  const intro = vars.isResend
    ? `Администратор сбросил ваш пароль в системе ГлобоАтлас. Старый пароль больше не работает — установите новый по ссылке ниже.`
    : `Вас пригласили в команду детского сада в роли <strong>${roleRu}</strong>. Чтобы получить доступ к личному кабинету — нажмите на кнопку ниже и создайте пароль.`;

  const body = `
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;margin-bottom:16px;">
      ${greeting}
    </div>
    <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:${FOREGROUND};">
      ${intro}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td style="border-radius:999px;background:${BRAND};">
          <a href="${vars.inviteUrl}" target="_blank"
             style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;">
            ${vars.isResend ? 'Установить новый пароль' : 'Войти в личный кабинет'}
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px 0;font-size:12px;color:${MUTED};line-height:1.6;">
      Если кнопка не работает — скопируйте ссылку в браузер:
    </p>
    <div style="padding:12px;background:${BRAND_PALE};border-radius:12px;font-family:'Courier New',monospace;font-size:12px;color:${BRAND};word-break:break-all;">
      ${vars.inviteUrl}
    </div>
    <p style="margin:24px 0 0 0;font-size:12px;color:${MUTED};line-height:1.6;">
      Ссылка действует 30 дней. После активации потребуется принять политику обработки персональных данных (152-ФЗ).
    </p>
  `;

  const text =
    `${vars.name ? `Здравствуйте, ${vars.name}!` : 'Здравствуйте!'}\n\n` +
    (vars.isResend
      ? `Администратор сбросил ваш пароль в системе ГлобоАтлас. Откройте ссылку, чтобы установить новый:\n${vars.inviteUrl}\n\n`
      : `Вас пригласили в команду в роли ${roleRu}. Откройте ссылку, чтобы создать пароль:\n${vars.inviteUrl}\n\n`) +
    `Ссылка действует 30 дней.\n\nГлобоАтлас`;

  return { subject, html: shell(subject, body), text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
