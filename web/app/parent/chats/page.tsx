'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { ChatRoom } from '@/lib/types';
import Link from 'next/link';

const TYPE_LABELS: Record<string, string> = {
  teacher_parent: 'С педагогом',
  pediatrician_parent: 'С педиатром',
  teacher_psychologist: 'С психологом',
};

export default function ParentChats() {
  const [chats, setChats] = useState<ChatRoom[]>([]);
  useEffect(() => { api.get('/chats').then(r => setChats(r.data)); }, []);
  return (
    <PageLayout title="Чаты">
      <div className="space-y-2">
        {chats.length === 0 && <p className="text-gray-400 text-center py-8">Нет активных чатов</p>}
        {chats.map(chat => {
          const lastMsg = chat.messages?.[0];
          return (
            <Link key={chat.id} href={`/parent/chats/${chat.id}`} className="block bg-white border rounded-xl p-4 hover:border-indigo-300">
              <div className="flex justify-between">
                <span className="font-medium">{TYPE_LABELS[chat.type] || chat.type}</span>
                {lastMsg && <span className="text-xs text-gray-400">{new Date(lastMsg.createdAt).toLocaleDateString('ru')}</span>}
              </div>
              {lastMsg && <p className="text-sm text-gray-500 truncate mt-1">{lastMsg.sender?.name}: {lastMsg.text}</p>}
            </Link>
          );
        })}
      </div>
    </PageLayout>
  );
}
