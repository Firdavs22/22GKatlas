'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Badge } from '@/components/ui';
import VideoEmbed from '@/components/VideoEmbed';
import api from '@/lib/api';

interface KbArticle {
  id: string;
  title: string;
  excerpt?: string | null;
  body: string;
  videoUrl?: string | null;
  coverUrl?: string | null;
  createdAt: string;
  category?: { id: string; title: string };
}

export default function KbArticlePage() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<KbArticle | null>(null);

  useEffect(() => {
    api.get(`/kb/articles/${id}`).then(r => setArticle(r.data));
  }, [id]);

  if (!article) {
    return (
      <PageLayout showBackButton>
        <p className="p-8 text-center text-slate-400">Загрузка…</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      showBackButton
      eyebrow={article.category?.title || 'База знаний'}
      title={article.title}
    >
      <Card padding="md">
        {article.coverUrl && (
          <div className="aspect-video rounded-xl overflow-hidden bg-brand-pale/40 mb-5">
            <img src={article.coverUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {article.videoUrl && (
          <div className="mb-5">
            <VideoEmbed url={article.videoUrl} title={article.title} />
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
          <BookOpen size={12} />
          {new Date(article.createdAt).toLocaleDateString('ru-RU', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
          {article.category && (
            <>
              <span className="text-slate-300">·</span>
              <Badge tone="neutral">{article.category.title}</Badge>
            </>
          )}
        </div>

        {article.excerpt && (
          <p className="text-base text-slate-700 italic mb-4">{article.excerpt}</p>
        )}

        <div className="prose prose-slate max-w-none">
          {article.body.split('\n\n').map((para, i) => (
            <p key={i} className="text-base leading-relaxed text-slate-700 mb-3 whitespace-pre-wrap">
              {para}
            </p>
          ))}
        </div>
      </Card>
    </PageLayout>
  );
}
