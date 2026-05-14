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
  /** If true and src is an image uploaded post-Sharp era, swap to /api/files/<uuid>_preview.jpg */
  preview?: boolean;
  /** Lazy-load image (default: true) */
  lazy?: boolean;
}

/** Derive preview URL from a main image URL produced by FilesService.
 *  /api/files/<uuid>.jpg → /api/files/<uuid>_preview.jpg
 *  Returns null when the path doesn't match the pattern. */
function derivePreviewUrl(src: string): string | null {
  const m = /^(.*\/files\/)([^/.]+)\.(jpg|jpeg|png|webp|gif)$/i.exec(src);
  if (!m) return null;
  return `${m[1]}${m[2]}_preview.jpg`;
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
  preview = false,
  lazy = true,
}: AuthMediaProps) {
  const [error, setError] = useState(false);
  const [previewError, setPreviewError] = useState(false);

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

  const mediaType = type || getMediaType(src);

  if (mediaType === 'video') {
    return (
      <video
        src={getAuthMediaUrl(src)}
        className={className}
        style={style}
        controls={controls}
        onError={() => setError(true)}
      />
    );
  }

  const previewSrc = preview ? derivePreviewUrl(src) : null;
  const tryingPreview = previewSrc && !previewError;
  const effectiveSrc = tryingPreview ? previewSrc : src;
  const authUrl = getAuthMediaUrl(effectiveSrc);

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={authUrl}
      alt={alt}
      className={className}
      style={style}
      loading={lazy ? 'lazy' : undefined}
      onError={() => {
        if (tryingPreview) {
          // Preview missing — silently fall back to the main URL once.
          setPreviewError(true);
        } else {
          setError(true);
        }
      }}
    />
  );
}
