'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Video, BookOpen } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Badge, SectionLabel } from '@/components/ui';
import api from '@/lib/api';

interface KbCategory {
  id: string;
  title: string;
  description?: string | null;
  _count?: { articles: number };
}

interface KbArticle {
  id: string;
  categoryId: string;
  title: string;
  excerpt?: string | null;
  videoUrl?: string | null;
  coverUrl?: string | null;
  createdAt: string;
  category?: { id: string; title: string };
}

const inputCls =
  'w-full h-10 pl-9 pr-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

export default function ParentKnowledge() {
  const [categories, setCategories] = useState<KbCategory[]>([]);
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [activeCat, setActiveCat] = useState<string>('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.get('/kb/categories').then(r => setCategories(r.data));
    api.get('/kb/articles').then(r => setArticles(r.data));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter(a => {
      if (activeCat && a.categoryId !== activeCat) return false;
      if (q) {
        const matches = [a.title, a.excerpt]
          .filter(Boolean)
          .some(v => v!.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [articles, activeCat, query]);

  return (
    <PageLayout
      eyebrow="Полезные материалы для родителей"
      title="База знаний"
    >
      <Card padding="md" className="mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск по статьям…"
            className={inputCls}
          />
        </div>
        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveCat('')}
              className={`px-3 h-7 text-xs rounded-full transition-colors ${
                !activeCat
                  ? 'bg-brand text-white'
                  : 'border border-slate-200 text-slate-600 hover:border-brand'
              }`}
            >
              Все
            </button>
            {categories.map(c => {
              const active = c.id === activeCat;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className={`px-3 h-7 text-xs rounded-full transition-colors ${
                    active
                      ? 'bg-brand text-white'
                      : 'border border-slate-200 text-slate-600 hover:border-brand'
                  }`}
                >
                  {c.title}{' '}
                  <span className={`ml-1 ${active ? 'text-white/80' : 'text-slate-400'}`}>
                    {c._count?.articles ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {filtered.length === 0 ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-12 text-center">
            {articles.length === 0
              ? 'Статей пока нет — администрация скоро добавит'
              : 'По вашему запросу ничего не найдено'}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(a => (
            <Link key={a.id} href={`/parent/knowledge/${a.id}`} className="group">
              <Card padding="md" className="hover:border-brand transition-colors h-full">
                {a.coverUrl && (
                  <div className="aspect-video rounded-xl overflow-hidden bg-brand-pale/40 mb-3">
                    <img src={a.coverUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {a.category && <Badge tone="neutral">{a.category.title}</Badge>}
                  {a.videoUrl && (
                    <span className="inline-flex items-center gap-1 text-xs text-brand">
                      <Video size={12} /> видео
                    </span>
                  )}
                </div>
                <h3 className="font-serif text-xl mb-2 group-hover:text-brand transition-colors">
                  {a.title}
                </h3>
                {a.excerpt && (
                  <p className="text-sm text-slate-600 line-clamp-3">{a.excerpt}</p>
                )}
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
                  <BookOpen size={12} />
                  {new Date(a.createdAt).toLocaleDateString('ru-RU', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
