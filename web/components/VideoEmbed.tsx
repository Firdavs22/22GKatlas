'use client';

interface VideoEmbedProps {
  url: string;
  title?: string;
}

function toEmbedUrl(url: string): { src: string | null; raw: boolean } {
  try {
    const u = new URL(url);

    // YouTube
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      const id =
        u.hostname.includes('youtu.be')
          ? u.pathname.slice(1)
          : u.searchParams.get('v') || u.pathname.split('/').pop() || '';
      if (id) return { src: `https://www.youtube.com/embed/${id}`, raw: false };
    }

    // VK
    if (u.hostname.includes('vk.com') || u.hostname.includes('vk.ru')) {
      // /video-12345_67890 or video.php?oid=...&id=...
      const m = u.pathname.match(/video(-?\d+)_(\d+)/);
      if (m) return { src: `https://vk.com/video_ext.php?oid=${m[1]}&id=${m[2]}&hd=2`, raw: false };
      const oid = u.searchParams.get('oid');
      const id = u.searchParams.get('id');
      if (oid && id) return { src: `https://vk.com/video_ext.php?oid=${oid}&id=${id}&hd=2`, raw: false };
    }

    // Дзен/RuTube/прочее — оставляем как есть, рендерим как обычный iframe (или как ссылку)
    return { src: url, raw: true };
  } catch {
    return { src: null, raw: false };
  }
}

export default function VideoEmbed({ url, title }: VideoEmbedProps) {
  const { src, raw } = toEmbedUrl(url);
  if (!src) return null;
  if (raw) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="text-slate-500 mb-2">Внешнее видео:</div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand hover:underline break-all"
        >
          {url}
        </a>
      </div>
    );
  }
  return (
    <div className="relative aspect-video rounded-2xl overflow-hidden bg-black">
      <iframe
        src={src}
        title={title || 'Видео'}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
