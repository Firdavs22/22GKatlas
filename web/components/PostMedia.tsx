'use client';
import { useState } from 'react';
import AuthMedia from './AuthMedia';
import Lightbox from './Lightbox';

interface PostMediaProps {
  urls: string[];
  className?: string;
  /** Disable lightbox-on-click (e.g. in compact preview cards). */
  noLightbox?: boolean;
}

export default function PostMedia({ urls, className = '', noLightbox = false }: PostMediaProps) {
  const [openedIndex, setOpenedIndex] = useState<number | null>(null);

  if (!urls?.length) return null;

  const count = urls.length;
  const wrapper = `grid gap-1.5 rounded-2xl overflow-hidden ${className}`;

  const open = (i: number) => {
    if (!noLightbox) setOpenedIndex(i);
  };

  const tile = (url: string, i: number, classes: string, showExtra = false, extra = 0) => (
    <button
      key={i}
      type="button"
      onClick={() => open(i)}
      className={`${classes} bg-brand-pale/40 rounded-xl overflow-hidden ${noLightbox ? '' : 'cursor-zoom-in'}`}
    >
      <AuthMedia
        src={url}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      {showExtra && extra > 0 && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-medium text-lg">
          +{extra}
        </div>
      )}
    </button>
  );

  let content: React.ReactNode;
  if (count === 1) {
    content = (
      <div className={wrapper}>
        {tile(urls[0], 0, 'relative w-full aspect-[4/3] sm:aspect-[16/10] block')}
      </div>
    );
  } else if (count === 2) {
    content = (
      <div className={`${wrapper} grid-cols-2`}>
        {urls.map((url, i) => tile(url, i, 'relative aspect-square block'))}
      </div>
    );
  } else if (count === 3) {
    content = (
      <div className={`${wrapper} grid-cols-3`}>
        {urls.map((url, i) => tile(url, i, 'relative aspect-square block'))}
      </div>
    );
  } else {
    const shown = urls.slice(0, 4);
    const extra = count - 4;
    content = (
      <div className={`${wrapper} grid-cols-2`}>
        {shown.map((url, i) =>
          tile(url, i, 'relative aspect-square block', i === 3, extra),
        )}
      </div>
    );
  }

  return (
    <>
      {content}
      {!noLightbox && (
        <Lightbox
          src={openedIndex !== null ? urls[openedIndex] : null}
          onClose={() => setOpenedIndex(null)}
        />
      )}
    </>
  );
}
