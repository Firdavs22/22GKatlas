'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { FeedItem, Child } from '@/lib/types';

const TYPE_ICONS: Record<string, string> = {
  child_photo: '📷 Фото',
  child_achievement: '⭐ Достижение',
  group_news: '📢 Новость группы',
  school_news: '🏫 Объявление сада',
  menu: '🍎 Меню на неделю',
  event: '🎉 Календарь событий',
};

export default function ParentFeed() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [children, setChildren] = useState<Child[]>([]);

  useEffect(() => {
    api.get('/feed').then(r => setFeed(r.data));
    api.get('/children').then(r => setChildren(r.data));
  }, []);

  const downloadAll = (childId: string) => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/api/feed/download/${childId}`, '_blank');
  };

  return (
    <PageLayout title="Лента">
      <div className="flex gap-2 mb-4 flex-wrap">
        {children.map(c => (
          <button key={c.id} onClick={() => downloadAll(c.id)} className="text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100">
            Скачать фото {c.name}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {feed.map(item => (
          <div key={item.id} className="bg-white border rounded-xl p-4">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span className={item.type === 'child_achievement' ? 'text-green-600 font-medium' : ''}>
                {TYPE_ICONS[item.type] || item.type}
              </span>
              <span>{new Date(item.createdAt).toLocaleDateString('ru')}</span>
            </div>
            {item.title && <div className="font-medium mb-1">{item.title}</div>}
            {item.text && <p className="text-sm text-gray-600 whitespace-pre-wrap">{item.text}</p>}
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
