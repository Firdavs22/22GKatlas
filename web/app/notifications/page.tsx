'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { Notification } from '@/lib/types';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  useEffect(() => { api.get('/notifications').then(r => setNotifications(r.data)); }, []);
  const readAll = async () => {
    await api.post('/notifications/read-all');
    setNotifications(prev => prev.map(n => ({...n, read: true})));
  };
  return (
    <PageLayout title="Уведомления">
      <div className="flex justify-end mb-4">
        <button onClick={readAll} className="text-sm text-indigo-600 hover:underline">Прочитать все</button>
      </div>
      <div className="space-y-2">
        {notifications.length === 0 && <p className="text-gray-400 text-center py-8">Нет уведомлений</p>}
        {notifications.map(n => (
          <div key={n.id} className={`bg-white border rounded-xl p-4 ${!n.read ? 'border-indigo-200' : ''}`}>
            <div className="flex justify-between">
              <div className="font-medium text-sm">{n.title}</div>
              {!n.read && <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1"></div>}
            </div>
            <p className="text-sm text-gray-500 mt-1">{n.body}</p>
            <div className="text-xs text-gray-400 mt-2">{new Date(n.createdAt).toLocaleString('ru')}</div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
