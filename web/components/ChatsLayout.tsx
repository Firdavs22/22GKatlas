'use client';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, MessageCircle } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card } from '@/components/ui';
import api from '@/lib/api';
import type { PickerContact } from '@/components/StaffPicker';
import NewChatButton from '@/components/NewChatButton';

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
  participants: ChatParticipant[];
  messages?: ChatMessage[];
  unreadCount?: number;
}

interface ChatsLayoutProps {
  /** e.g. '/parent/chats'. Used for Link hrefs and active-id detection. */
  basePath: string;
  eyebrow: string;
  /** Human labels for participant roles (used in subtitle). */
  roleLabels: Record<string, string>;
  /** Roles available in the new-chat picker, in display order. */
  pickerRoleOrder: string[];
  /** Labels in the new-chat picker (may be more verbose than roleLabels). */
  pickerRoleLabels: Record<string, string>;
  /** Map: counterpart role → the `type` field expected by POST /chats. */
  chatTypeByRole: Record<string, string>;
  /** Fallback chat type when counterpart role is missing from the map. */
  defaultChatType: string;
  pickerEmptyHint?: string;
  children: ReactNode;
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

function counterpartFor(chat: ChatRoom, selfId?: string): { name: string; role?: string } {
  const others = chat.participants
    .filter(p => p.userId !== selfId)
    .map(p => p.user)
    .filter(Boolean) as { id: string; name: string; role?: string }[];
  if (others.length === 0) return { name: 'Чат' };
  return { name: others[0].name, role: others[0].role };
}

export default function ChatsLayout({
  basePath,
  eyebrow,
  roleLabels,
  pickerRoleOrder,
  pickerRoleLabels,
  chatTypeByRole,
  defaultChatType,
  pickerEmptyHint,
  children,
}: ChatsLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [query, setQuery] = useState('');
  const [selfId, setSelfId] = useState<string>();
  const [staff, setStaff] = useState<PickerContact[]>([]);
  const [creating, setCreating] = useState(false);

  const activeId = useMemo(() => {
    if (!pathname.startsWith(basePath)) return null;
    const tail = pathname.slice(basePath.length).replace(/^\/+/, '');
    if (!tail) return null;
    return tail.split('/')[0];
  }, [pathname, basePath]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        if (u?.id) setSelfId(u.id);
      } catch {}
    }
    api.get('/chats/staff').then(r => setStaff(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/chats').then(r => setChats(r.data)).catch(() => {});
  }, [pathname]);

  const sorted = useMemo(
    () =>
      [...chats].sort((a, b) => {
        const aTime = new Date(a.messages?.[0]?.createdAt || 0).getTime();
        const bTime = new Date(b.messages?.[0]?.createdAt || 0).getTime();
        return bTime - aTime;
      }),
    [chats],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return sorted;
    const q = query.toLowerCase();
    return sorted.filter(c => {
      const { name, role } = counterpartFor(c, selfId);
      return name.toLowerCase().includes(q) || (role && roleLabels[role]?.toLowerCase().includes(q));
    });
  }, [sorted, query, selfId, roleLabels]);

  const startChat = async (s: PickerContact) => {
    setCreating(true);
    try {
      const { data } = await api.post('/chats', {
        targetUserId: s.id,
        type: chatTypeByRole[s.role] || defaultChatType,
      });
      router.push(`${basePath}/${data.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert('Ошибка: ' + (msg || 'не удалось создать чат'));
    } finally {
      setCreating(false);
    }
  };

  const activeChat = useMemo(
    () => (activeId ? chats.find(c => c.id === activeId) : null),
    [chats, activeId],
  );
  const activeCounterpart = activeChat ? counterpartFor(activeChat, selfId) : null;

  return (
    <PageLayout
      eyebrow={eyebrow}
      title="Чаты"
      full
      actions={
        <NewChatButton
          staff={staff}
          roleLabels={pickerRoleLabels}
          roleOrder={pickerRoleOrder}
          loading={creating}
          emptyHint={pickerEmptyHint || 'Контактов нет'}
          onPick={startChat}
        />
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-4 h-[calc(100vh-220px)] min-h-[480px]">
        {/* Left: chat list */}
        <Card padding="none" className="flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Поиск по чатам"
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-sm text-slate-400 py-12 text-center px-4">
                {query ? 'Ничего не найдено' : 'Активных чатов нет'}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.map(chat => {
                  const { name, role } = counterpartFor(chat, selfId);
                  const lastMsg = chat.messages?.[0];
                  const unread = chat.unreadCount || 0;
                  const isActive = chat.id === activeId;
                  return (
                    <li key={chat.id}>
                      <Link
                        href={`${basePath}/${chat.id}`}
                        className={`block px-4 py-3 transition-colors ${
                          isActive ? 'bg-brand-pale/40' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative w-10 h-10 rounded-full bg-brand-pale flex items-center justify-center font-serif text-brand shrink-0">
                            {name.charAt(0).toUpperCase()}
                            {unread > 0 && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-danger ring-2 ring-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2 mb-0.5">
                              <span
                                className={`text-sm truncate ${
                                  unread > 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground'
                                }`}
                              >
                                {name}
                              </span>
                              {lastMsg && (
                                <span className="text-[11px] text-slate-500 shrink-0">
                                  {relativeDate(lastMsg.createdAt)}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mb-0.5">
                              {role ? roleLabels[role] || role : ''}
                            </div>
                            <div className="flex items-center gap-2">
                              {lastMsg && (
                                <p
                                  className={`text-xs truncate flex-1 ${
                                    unread > 0 ? 'text-foreground font-medium' : 'text-slate-600'
                                  }`}
                                >
                                  {lastMsg.text}
                                </p>
                              )}
                              {unread > 0 && (
                                <span className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-brand text-white text-[11px] font-semibold">
                                  {unread > 99 ? '99+' : unread}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>

        {/* Right: active dialog or empty state */}
        <Card padding="none" className="overflow-hidden flex flex-col min-w-0">
          {activeChat && activeCounterpart ? (
            <>
              <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-full bg-brand-pale flex items-center justify-center font-serif text-brand shrink-0">
                  {activeCounterpart.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">
                    {activeCounterpart.name}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {activeCounterpart.role
                      ? roleLabels[activeCounterpart.role] || activeCounterpart.role
                      : ''}
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-0 flex flex-col">{children}</div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="w-14 h-14 rounded-full bg-brand-pale flex items-center justify-center text-brand mb-3">
                <MessageCircle size={24} />
              </div>
              <div className="text-sm font-medium text-foreground mb-1">Выберите чат</div>
              <div className="text-xs text-slate-500">
                Откройте диалог слева или начните новый
              </div>
            </div>
          )}
        </Card>
      </div>
    </PageLayout>
  );
}
