/** Build the public invite URL for a parent to set their password. */
export function buildInviteUrl(token: string): string {
  if (typeof window === 'undefined') return `/invite?token=${encodeURIComponent(token)}`;
  return `${window.location.origin}/invite?token=${encodeURIComponent(token)}`;
}

/** Open Telegram share dialog for the given URL and message. */
export function telegramShareUrl(url: string, text: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

/** Open MAX messenger (app or web). User picks the chat manually. */
export const MAX_OPEN_URL = 'https://max.ru/';
