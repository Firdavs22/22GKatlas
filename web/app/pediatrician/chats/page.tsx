'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import { Card } from '@/components/ui';
import api from '@/lib/api';
import { ChatRoom } from '@/lib/types';

const TYPE_LABEL: Record<string, string> = {
  pediatrician_parent: 'С родителем',
  teacher_parent: 'С педагогом',
};

function relativeDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export default function PediatricianChats() {
  const [chats, setChats] = useState<ChatRoom[]>([]);
  useEffect(() => {
    api.get('/chats').then(r => setChats(r.data));
  }, []);

  return (
    <PageLayout eyebrow="С родителями и педагогами" title="Чаты">
      {chats.length === 0 ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-12 text-center">
            Активных чатов нет
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {chats.map(chat => {
            const lastMsg = chat.messages?.[0];
            const label = TYPE_LABEL[chat.type] || chat.type;
            return (
              <Link key={chat.id} href={`/pediatrician/chats/${chat.id}`}>
                <Card padding="md" className="hover:border-brand transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-pale flex items-center justify-center font-serif text-brand shrink-0">
                      {label.charAt(2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3 mb-0.5">
                        <span className="font-medium text-sm truncate">{label}</span>
                        {lastMsg && (
                          <span className="text-xs text-slate-500 shrink-0">
                            {relativeDate(lastMsg.createdAt)}
                          </span>
                        )}
                      </div>
                      {lastMsg && (
                        <p className="text-sm text-slate-600 truncate">
                          <span className="text-slate-500">{lastMsg.sender?.name}:</span>{' '}
                          {lastMsg.text}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}
