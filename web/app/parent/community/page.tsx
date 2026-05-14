'use client';
import { useEffect, useState } from 'react';
import { Camera, Award, MessageSquare, Megaphone, Calendar, Apple } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Badge, SectionLabel } from '@/components/ui';
import api from '@/lib/api';
import { FeedItem } from '@/lib/types';
import AuthMedia from '@/components/AuthMedia';

const TYPE_CONFIG: Record<string, { icon: any; label: string; tone: 'brand' | 'success' | 'neutral' | 'warn' }> = {
  child_photo: { icon: Camera, label: 'фото', tone: 'brand' },
  child_achievement: { icon: Award, label: 'достижение', tone: 'success' },
  group_news: { icon: MessageSquare, label: 'новость', tone: 'brand' },
  school_news: { icon: Megaphone, label: 'объявление', tone: 'neutral' },
  menu: { icon: Apple, label: 'меню', tone: 'neutral' },
  event: { icon: Calendar, label: 'событие', tone: 'warn' },
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} в ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function ParentCommunity() {
  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    api.get('/feed').then(r => {
      const communityItems = r.data.filter((item: FeedItem) =>
        ['school_news', 'menu', 'event'].includes(item.type) || item.scope === 'school'
      );
      setFeed(communityItems.sort((a: FeedItem, b: FeedItem) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    });
  }, []);

  return (
    <PageLayout
      eyebrow="Новости и информация для всех"
      title="Сообщество"
    >
      {feed.length === 0 ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-12 text-center">
            Объявлений пока нет
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {feed.map(item => {
            const config = TYPE_CONFIG[item.type];
            const Icon = config?.icon;
            return (
              <Card key={item.id} padding="md">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-pale flex items-center justify-center text-brand shrink-0">
                    {Icon && <Icon size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        {item.scope === 'school' ? 'Всем' : 'Сообщество'}
                      </div>
                      <Badge tone={config?.tone || 'neutral'}>
                        {config?.label || item.type}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {formatDateTime(item.createdAt)}
                    </div>
                  </div>
                </div>

                {item.title && (
                  <h3 className="font-serif text-xl mb-2">{item.title}</h3>
                )}

                {item.text && (
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap mb-3">
                    {item.text}
                  </p>
                )}

                {item.mediaUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {item.mediaUrls.slice(0, 3).map((url, i) => (
                      <div key={i} className="aspect-square rounded-lg overflow-hidden bg-brand-pale/40">
                        <AuthMedia src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                  {item._count?.likes !== undefined && (
                    <span>{item._count.likes} лайков</span>
                  )}
                  {item._count?.comments !== undefined && (
                    <span>{item._count.comments} комментариев</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}
