'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card } from '@/components/ui';
import api from '@/lib/api';

interface ChatParticipant {
  userId: string;
  user?: { id: string; name: string; role?: string };
  lastReadAt?: string;
}

interface ChatMessage {
  id: string;
  text: string;
  createdAt: string;
  sender?: { id: string; name: string };
}

interface ChatRoom {
  id: string;
  type: string;
  childId?: string;
  participants: ChatParticipant[];
  messages?: ChatMessage[];
}

const ROLE_LABEL: Record<string, string> = {
  parent: 'родитель',
  pediatrician: 'педиатр',
  psychologist: 'психолог',
  admin: 'администрация',
};

function counterpartFor(chat: ChatRoom, selfId?: string): { name: string; role?: string; childHint?: string } {
  const others = chat.participants
    .filter(p => p.userId !== selfId)
    .map(p => p.user)
    .filter(Boolean) as { id: string; name: string; role?: string }[];
  if (others.length === 0) return { name: 'Чат' };
  return { name: others[0].name, role: others[0].role };
}

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

export default function TeacherChats() {
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [query, setQuery] = useState('');
  const [selfId, setSelfId] = useState<string>();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        if (u?.id) setSelfId(u.id);
      } catch {}
    }
    api.get('/chats').then(r => setChats(r.data));
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return chats;
    const q = query.toLowerCase();
    return chats.filter(c => {
      const { name, role } = counterpartFor(c, selfId);
      return name.toLowerCase().includes(q) || (role && ROLE_LABEL[role]?.includes(q));
    });
  }, [chats, query, selfId]);

  return (
    <PageLayout eyebrow="Родители · специалисты" title="Чаты">
      <div className="relative mb-4 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск по чатам"
          className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </div>

      {filtered.length === 0 ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-8 text-center">
            {query ? 'Ничего не найдено' : 'Активных чатов пока нет'}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(chat => {
            const { name, role } = counterpartFor(chat, selfId);
            const lastMsg = chat.messages?.[0];
            return (
              <Link key={chat.id} href={`/teacher/chats/${chat.id}`}>
                <Card padding="md" className="hover:border-brand transition-colors cursor-pointer h-full">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-pale flex items-center justify-center font-serif text-brand shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3 mb-0.5">
                        <span className="font-medium text-sm truncate">{name}</span>
                        {lastMsg && (
                          <span className="text-xs text-slate-500 shrink-0">
                            {relativeDate(lastMsg.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mb-1">
                        {role ? ROLE_LABEL[role] || role : ''}
                      </div>
                      {lastMsg && (
                        <p className="text-sm text-slate-600 truncate">{lastMsg.text}</p>
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
