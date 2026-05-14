'use client';
import { useEffect, useState } from 'react';
import { CheckCheck } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button } from '@/components/ui';
import api from '@/lib/api';
import { Notification } from '@/lib/types';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    api.get('/notifications').then(r => setNotifications(r.data));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const readAll = async () => {
    await api.post('/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <PageLayout
      eyebrow={unreadCount > 0 ? `Новых: ${unreadCount}` : 'Все прочитаны'}
      title="Уведомления"
      actions={
        unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={readAll}>
            <CheckCheck size={16} />
            Прочитать все
          </Button>
        )
      }
    >
      {notifications.length === 0 ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-12 text-center">
            Уведомлений пока нет
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <Card
              key={n.id}
              padding="md"
              className={n.read ? '' : 'border-brand-soft bg-brand-pale/20'}
            >
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="font-medium text-sm">{n.title}</div>
                {!n.read && (
                  <span className="w-2 h-2 bg-brand rounded-full mt-1.5 shrink-0" />
                )}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{n.body}</p>
              <div className="text-xs text-slate-400 mt-2">
                {new Date(n.createdAt).toLocaleString('ru-RU')}
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
