'use client';
import { useEffect, useMemo, useState } from 'react';
import { Check, EyeOff, Inbox } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, Badge, SectionLabel } from '@/components/ui';
import api from '@/lib/api';

interface FeedbackItem {
  id: string;
  message: string;
  isAnonymous: boolean;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  author: { id: string; name: string; email: string; role: string } | null;
}

type FilterKey = 'unread' | 'all';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} в ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('unread');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async (f: FilterKey) => {
    setLoading(true);
    try {
      const r = await api.get(`/feedback?filter=${f}`);
      setItems(r.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filter); }, [filter]);

  const unreadCount = useMemo(() => items.filter(i => !i.read).length, [items]);

  const markRead = async (id: string) => {
    setBusyId(id);
    try {
      await api.post(`/feedback/${id}/read`);
      setItems(prev => prev.map(i => i.id === id ? { ...i, read: true, readAt: new Date().toISOString() } : i));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PageLayout
      eyebrow={`${items.length} ${items.length === 1 ? 'сообщение' : items.length < 5 ? 'сообщения' : 'сообщений'}`}
      title="Обратная связь"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`px-3 h-8 text-xs rounded-full transition-colors ${
              filter === 'unread'
                ? 'bg-brand text-white'
                : 'border border-slate-200 text-slate-600 hover:border-brand'
            }`}
          >
            Непрочитанные{filter === 'unread' && unreadCount > 0 ? ` · ${unreadCount}` : ''}
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 h-8 text-xs rounded-full transition-colors ${
              filter === 'all'
                ? 'bg-brand text-white'
                : 'border border-slate-200 text-slate-600 hover:border-brand'
            }`}
          >
            Все
          </button>
        </div>
      }
    >
      <p className="text-sm text-slate-500 mb-6 max-w-2xl">
        Сообщения видите только вы. Анонимные приходят без имени автора — ответить на них нельзя.
      </p>

      {loading ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-8 text-center">Загрузка…</div>
        </Card>
      ) : items.length === 0 ? (
        <Card padding="md">
          <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
            <Inbox size={32} />
            <div className="text-sm">
              {filter === 'unread' ? 'Непрочитанных сообщений нет' : 'Сообщений пока нет'}
            </div>
          </div>
        </Card>
      ) : (
        <>
          <SectionLabel>{filter === 'unread' ? 'Непрочитанные' : 'Все сообщения'}</SectionLabel>
          <div className="space-y-3 mt-3">
            {items.map(item => (
              <Card key={item.id} padding="md" className={!item.read ? 'border-brand/30 bg-brand-pale/20' : ''}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.isAnonymous ? (
                        <Badge tone="neutral">
                          <EyeOff size={11} /> Анонимно
                        </Badge>
                      ) : (
                        <span className="font-medium text-sm truncate">
                          {item.author?.name || 'Удалённый пользователь'}
                        </span>
                      )}
                      {!item.read && <Badge tone="brand">Новое</Badge>}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {formatDateTime(item.createdAt)}
                      {!item.isAnonymous && item.author?.email && (
                        <> · <a href={`mailto:${item.author.email}`} className="hover:underline">{item.author.email}</a></>
                      )}
                    </div>
                  </div>
                  {!item.read && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markRead(item.id)}
                      disabled={busyId === item.id}
                    >
                      <Check size={14} />
                      Прочитано
                    </Button>
                  )}
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap mt-3 pt-3 border-t border-slate-100">
                  {item.message}
                </p>
              </Card>
            ))}
          </div>
        </>
      )}
    </PageLayout>
  );
}
