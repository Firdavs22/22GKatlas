'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, MessageCircle } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, SectionLabel } from '@/components/ui';
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
  senderId: string;
  sender?: { id: string; name: string };
}

interface ChatRoom {
  id: string;
  type: string;
  participants: ChatParticipant[];
  messages?: ChatMessage[];
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
}

const ROLE_LABEL: Record<string, string> = {
  teacher: 'педагог группы',
  pediatrician: 'педиатр',
  psychologist: 'психолог',
  admin: 'администрация',
};

function relativeDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function counterpartFor(chat: ChatRoom, selfId?: string): { name: string; role?: string } {
  const others = chat.participants.filter(p => p.userId !== selfId).map(p => p.user).filter(Boolean) as { id: string; name: string; role?: string }[];
  if (others.length === 0) return { name: 'Чат' };
  return { name: others[0].name, role: others[0].role };
}

export default function ParentChats() {
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [showStaffPicker, setShowStaffPicker] = useState(false);
  const [selfId, setSelfId] = useState<string>();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        if (u?.id) setSelfId(u.id);
      } catch {}
    }
    api.get('/chats').then(r => setChats(r.data));
    api.get('/chats/staff').then(r => setStaff(r.data)).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return chats;
    const q = query.toLowerCase();
    return chats.filter(c => {
      const { name, role } = counterpartFor(c, selfId);
      return name.toLowerCase().includes(q) || (role && ROLE_LABEL[role]?.includes(q));
    });
  }, [chats, query, selfId]);

  const startChat = async (s: StaffMember) => {
    setCreating(true);
    try {
      const { data } = await api.post('/chats', { targetUserId: s.id, type: 'teacher_parent' });
      router.push(`/parent/chats/${data.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert('Ошибка: ' + (msg || 'не удалось создать чат'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageLayout
      eyebrow="Общение с педагогами и специалистами"
      title="Чаты"
      actions={
        <Button variant="primary" size="sm" onClick={() => setShowStaffPicker(v => !v)}>
          <Plus size={16} />
          Новый чат
        </Button>
      }
    >
      {/* Inline staff picker — opens on "Новый чат" */}
      {showStaffPicker && (
        <Card padding="md" className="mb-6">
          <div className="flex items-baseline justify-between mb-3">
            <SectionLabel>Кому написать</SectionLabel>
            <button
              onClick={() => setShowStaffPicker(false)}
              className="text-xs text-slate-500 hover:text-foreground"
            >
              Закрыть
            </button>
          </div>
          {staff.length === 0 ? (
            <div className="text-sm text-slate-400 py-4 text-center">
              Сотрудники не назначены
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {staff.map(s => (
                <button
                  key={s.id}
                  onClick={() => startChat(s)}
                  disabled={creating}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-brand transition-colors disabled:opacity-50 text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-brand-pale flex items-center justify-center font-serif text-sm text-brand shrink-0">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{s.name}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {ROLE_LABEL[s.role] || s.role}
                    </div>
                  </div>
                  <MessageCircle size={16} className="text-slate-300 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск по чатам"
          className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </div>

      {/* Chat list */}
      {filtered.length === 0 ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-8 text-center">
            {query ? 'Ничего не найдено' : 'Нет активных чатов'}
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(chat => {
            const { name, role } = counterpartFor(chat, selfId);
            const lastMsg = chat.messages?.[0];
            const unread = false; // TODO: derive from lastReadAt
            return (
              <Link key={chat.id} href={`/parent/chats/${chat.id}`}>
                <Card
                  padding="md"
                  className="hover:border-brand transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-pale flex items-center justify-center font-serif text-brand shrink-0 mt-0.5">
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
                    {unread && (
                      <span className="w-5 h-5 rounded-full bg-brand text-white text-[11px] font-medium flex items-center justify-center shrink-0">
                        1
                      </span>
                    )}
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
