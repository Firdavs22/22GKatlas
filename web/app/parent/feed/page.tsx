'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Filter, Download, Calendar, Check } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, Badge, SectionLabel } from '@/components/ui';
import api from '@/lib/api';
import { Child } from '@/lib/types';
import PostMedia from '@/components/PostMedia';

interface FeedItem {
  id: string;
  type: 'child_photo' | 'child_achievement' | 'group_news' | 'school_news' | 'menu' | 'event';
  scope: 'child' | 'group' | 'school';
  title?: string;
  text?: string;
  mediaUrls: string[];
  createdAt: string;
  author?: { id: string; name: string; role?: string };
  group?: { id: string; name: string };
}

interface EventItem {
  id: string;
  title: string;
  description?: string;
  eventDate: string;
}

const TYPE_LABEL: Record<FeedItem['type'], string> = {
  child_photo: 'фото',
  child_achievement: 'достижение',
  group_news: 'новость',
  school_news: 'новость',
  menu: 'меню',
  event: 'событие',
};

const TYPE_TONE: Record<FeedItem['type'], 'brand' | 'success' | 'neutral' | 'warn'> = {
  child_photo: 'brand',
  child_achievement: 'success',
  group_news: 'brand',
  school_news: 'neutral',
  menu: 'neutral',
  event: 'warn',
};

type FilterKey = 'all' | 'photo' | 'achievement' | 'school' | 'group';

const FILTERS: { id: FilterKey; label: string }[] = [
  { id: 'all', label: 'Все публикации' },
  { id: 'photo', label: 'Фото' },
  { id: 'achievement', label: 'Достижения' },
  { id: 'school', label: 'Новости школы' },
  { id: 'group', label: 'Только моя группа' },
];

function authorInitial(name?: string): string {
  return (name?.trim()?.charAt(0) || '?').toUpperCase();
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} в ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function FeedPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [active, setActive] = useState<Set<FilterKey>>(() => new Set<FilterKey>(['all']));
  const [downloading, setDownloading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!filterRef.current?.contains(e.target as Node)) setFilterOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setFilterOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [filterOpen]);

  const activeCount = active.has('all') ? 0 : active.size;

  useEffect(() => {
    api.get('/feed').then(r => setFeed(r.data));
    api.get('/children').then(r => setChildren(r.data));
    api.get('/activities/events').then(r => setEvents(r.data)).catch(() => {});
  }, []);

  const toggleFilter = (id: FilterKey) => {
    setActive(prev => {
      const next = new Set(prev);
      if (id === 'all') return new Set<FilterKey>(['all']);
      next.delete('all');
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) next.add('all');
      return next;
    });
  };

  const filtered = useMemo(() => {
    if (active.has('all')) return feed;
    return feed.filter(item => {
      if (active.has('photo') && item.type === 'child_photo') return true;
      if (active.has('achievement') && item.type === 'child_achievement') return true;
      if (active.has('school') && (item.type === 'school_news' || item.scope === 'school')) return true;
      if (active.has('group') && item.scope === 'group') return true;
      return false;
    });
  }, [feed, active]);

  const upcomingEvent = useMemo(() => {
    const now = Date.now();
    return events
      .filter(e => new Date(e.eventDate).getTime() >= now)
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())[0];
  }, [events]);

  const handleDownloadAll = async () => {
    const child = children[0];
    if (!child) return;
    setDownloading(true);
    try {
      const response = await api.get(`/feed/download/${child.id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `photos-${child.name}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <PageLayout
      eyebrow="Публикации группы"
      title="Лента"
      actions={
        <>
          <div className="relative" ref={filterRef}>
            <Button variant="outline" size="sm" onClick={() => setFilterOpen(v => !v)}>
              <Filter size={16} />
              Фильтр
              {activeCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-brand text-white text-[10px] font-medium">
                  {activeCount}
                </span>
              )}
            </Button>
            {filterOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] w-64 rounded-2xl border border-slate-200 bg-white shadow-lg z-30">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Показывать</span>
                  {activeCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setActive(new Set<FilterKey>(['all']))}
                      className="text-xs text-brand hover:underline"
                    >
                      Сбросить
                    </button>
                  )}
                </div>
                <ul className="py-1.5">
                  {FILTERS.map(f => {
                    const checked = active.has(f.id);
                    return (
                      <li key={f.id}>
                        <button
                          type="button"
                          onClick={() => toggleFilter(f.id)}
                          className="w-full px-4 py-2 flex items-center justify-between text-sm hover:bg-slate-50 transition-colors"
                        >
                          <span className={checked ? 'text-foreground font-medium' : 'text-slate-600'}>{f.label}</span>
                          {checked && <Check size={14} className="text-brand" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadAll} disabled={downloading}>
            <Download size={16} />
            {downloading ? 'Архив...' : 'Скачать все фото'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Posts */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <Card padding="md">
              <div className="text-sm text-slate-400 py-8 text-center">Публикаций нет</div>
            </Card>
          ) : (
            filtered.map(item => (
              <Card key={item.id} padding="md">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-brand-pale flex items-center justify-center font-serif text-brand shrink-0">
                    {authorInitial(item.author?.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium text-sm truncate">
                        {item.author?.name || 'Администрация'}
                      </span>
                      <Badge tone={TYPE_TONE[item.type]}>{TYPE_LABEL[item.type]}</Badge>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {item.scope === 'school' ? 'школа' : item.group?.name || 'группа'} · {formatDateTime(item.createdAt)}
                    </div>
                  </div>
                </div>
                {item.title && <h3 className="font-serif text-2xl mb-2">{item.title}</h3>}
                {item.text && (
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap mb-3">
                    {item.text}
                  </p>
                )}
                <PostMedia urls={item.mediaUrls} />
              </Card>
            ))
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {upcomingEvent && (
            <Card padding="md">
              <SectionLabel>Скоро</SectionLabel>
              <h3 className="font-serif text-xl mt-1 mb-2">{upcomingEvent.title}</h3>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                <Calendar size={14} />
                {new Date(upcomingEvent.eventDate).toLocaleDateString('ru-RU', {
                  day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                })}
              </div>
              {upcomingEvent.description && (
                <p className="text-sm text-slate-700 mb-4">{upcomingEvent.description}</p>
              )}
              <Button variant="subtle" size="sm" className="w-full">
                Зарегистрироваться
              </Button>
            </Card>
          )}
        </aside>
      </div>
    </PageLayout>
  );
}
