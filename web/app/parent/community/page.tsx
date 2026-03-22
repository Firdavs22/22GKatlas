'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { FeedItem } from '@/lib/types';

const TYPE_ICONS: Record<string, string> = {
  child_photo: '📷 Фото',
  child_achievement: '⭐ Достижение',
  group_news: '📢 Новость группы',
  school_news: '🏫 Объявление сада',
  menu: '🍎 Меню на неделю',
  event: '🎉 Календарь событий',
};

export default function ParentCommunity() {
  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    // В Сообществе показываем только общие новости сада, меню и события
    api.get('/feed').then(r => {
      const communityItems = r.data.filter((item: FeedItem) => 
        ['school_news', 'menu', 'event'].includes(item.type) || item.scope === 'school'
      );
      setFeed(communityItems);
    });
  }, []);

  return (
    <PageLayout title="Сообщество">
      <div className="mb-6">
        <p className="text-gray-500 text-sm">Здесь публикуются общие новости, праздники и меню на неделю.</p>
      </div>
      
      {feed.length === 0 ? (
        <div className="text-center text-gray-500 py-10 bg-gray-50 rounded-xl border border-dashed">
          В сообществе пока нет записей
        </div>
      ) : (
        <div className="space-y-4">
          {feed.map(item => (
            <div key={item.id} className="bg-white border border-gray-100 shadow-sm rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between text-xs text-gray-400 mb-3">
                <span className="font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                  {TYPE_ICONS[item.type] || item.type}
                </span>
                <span>{new Date(item.createdAt).toLocaleDateString('ru')}</span>
              </div>
              {item.title && <h3 className="font-semibold text-lg text-gray-900 mb-2">{item.title}</h3>}
              {item.text && <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{item.text}</p>}
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
