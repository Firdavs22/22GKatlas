'use client';
import { useState } from 'react';
import { getAuthMediaUrl, getMediaType } from '@/lib/media';

interface AuthMediaProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Fallback content when no src or load error */
  fallback?: React.ReactNode;
  /** Force type: 'image' | 'video'. Auto-detected from extension if not provided */
  type?: 'image' | 'video';
  /** Video controls (default: true) */
  controls?: boolean;
}

/**
 * Компонент для отображения медиафайлов, требующих JWT-авторизации.
 * 
 * Автоматически добавляет JWT-токен в URL через query string,
 * определяет тип (image/video) по расширению, показывает fallback при ошибке.
 */
export default function AuthMedia({
  src,
  alt = '',
  className = '',
  style,
  fallback,
  type,
  controls = true,
}: AuthMediaProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <>
        {fallback || (
          <div
            className={className}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f3f4f6',
              color: '#9ca3af',
              fontSize: 32,
              ...style,
            }}
          >
            📄
          </div>
        )}
      </>
    );
  }

  const authUrl = getAuthMediaUrl(src);
  const mediaType = type || getMediaType(src);

  if (mediaType === 'video') {
    return (
      <video
        src={authUrl}
        className={className}
        style={style}
        controls={controls}
        onError={() => setError(true)}
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={authUrl}
      alt={alt}
      className={className}
      style={style}
      onError={() => setError(true)}
    />
  );
}
