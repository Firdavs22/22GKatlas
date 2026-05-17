'use client';
import { useEffect, useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import AuthMedia from './AuthMedia';
import { getAuthMediaUrl } from '@/lib/media';

interface LightboxProps {
  src: string | null;
  alt?: string;
  /** Suggested filename when user clicks "Скачать". */
  downloadName?: string;
  onClose: () => void;
}

export default function Lightbox({ src, alt, downloadName, onClose }: LightboxProps) {
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [src, onClose]);

  const handleDownload = async () => {
    if (!src) return;
    setDownloading(true);
    try {
      const url = getAuthMediaUrl(src) || src;
      const res = await fetch(url, { credentials: 'omit' });
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = downloadName || filenameFromUrl(src) || 'photo.jpg';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('download failed', err);
    } finally {
      setDownloading(false);
    }
  };

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2" onClick={e => e.stopPropagation()}>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors disabled:opacity-60"
          aria-label="Скачать"
        >
          {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          <span className="text-sm">Скачать</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
          aria-label="Закрыть"
        >
          <X size={22} />
        </button>
      </div>
      <div className="max-w-[95vw] max-h-[92vh] cursor-default" onClick={e => e.stopPropagation()}>
        <AuthMedia
          src={src}
          alt={alt || ''}
          className="max-w-[95vw] max-h-[92vh] object-contain rounded-2xl shadow-2xl"
        />
      </div>
    </div>
  );
}

function filenameFromUrl(url: string): string {
  try {
    const u = url.split('?')[0];
    const last = u.split('/').pop() || '';
    return last;
  } catch {
    return '';
  }
}
