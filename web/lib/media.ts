import { API_URL } from './network';

/** Media uses the browser's httpOnly session cookie, never a JWT in the URL. */
export function getAuthMediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  const relative = path.startsWith('/api/') ? path : path.startsWith('/files/') ? `/api${path}` : null;
  if (relative) {
    const url = new URL(relative, 'https://internal.invalid');
    url.searchParams.delete('token');
    return `${API_URL}${url.pathname}${url.search}`;
  }
  try {
    const url = new URL(path);
    if (/^\/api\/files\//.test(url.pathname)) {
      url.searchParams.delete('token');
      return `${API_URL}${url.pathname}${url.search}`;
    }
  } catch { /* Relative paths outside the API remain unchanged. */ }
  return path;
}

/**
 * Определяет тип медиафайла по расширению URL.
 */
export function getMediaType(url: string | null | undefined): 'image' | 'video' | 'other' {
  if (!url) return 'other';
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'video';
  return 'other';
}

/**
 * Нормализует тип портфолио-элемента. Поддерживает разные варианты записи:
 *   'photo' | 'Фото' | 'image' | 'img' → 'photo'
 *   'video' | 'Видео'                  → 'video'
 * Если тип неясен — определяем по расширению fileUrl.
 */
export function normalizePortfolioType(
  type: string | null | undefined,
  fileUrl?: string | null,
): 'photo' | 'video' | 'document' {
  const t = (type || '').trim().toLowerCase();
  if (t === 'photo' || t === 'фото' || t === 'image' || t === 'img') return 'photo';
  if (t === 'video' || t === 'видео') return 'video';
  if (t === 'document' || t === 'документ' || t === 'doc') return 'document';
  const m = getMediaType(fileUrl);
  if (m === 'image') return 'photo';
  if (m === 'video') return 'video';
  return 'document';
}
