/**
 * Утилита для построения URL медиафайлов с авторизацией.
 * 
 * Браузер не может отправить Authorization header в <img src> / <video src>,
 * поэтому мы передаём JWT-токен через query-параметр ?token=.
 */

import { API_URL } from './network';

/**
 * Добавляет JWT-токен к URL файла для авторизованного доступа.
 * Поддерживает:
 *  - относительные пути ("/api/files/abc.jpg")
 *  - абсолютные пути ("http://localhost:3001/api/files/abc.jpg")
 *  - null/undefined/пустые строки → возвращает пустую строку
 */
export function getAuthMediaUrl(path: string | null | undefined): string {
  if (!path) return '';

  if (typeof window === 'undefined') return path;

  const token = localStorage.getItem('token');
  if (!token) return path;

  // Build full URL
  let fullUrl: string;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    fullUrl = path;
  } else if (path.startsWith('/api/')) {
    fullUrl = `${API_URL}${path}`;
  } else {
    fullUrl = path;
  }

  // Append token as query parameter
  const separator = fullUrl.includes('?') ? '&' : '?';
  return `${fullUrl}${separator}token=${encodeURIComponent(token)}`;
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
