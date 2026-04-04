'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { ChatRoom } from '@/lib/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const TYPE_LABELS: Record<string, string> = {
  teacher_parent: 'Педагог',
  pediatrician_parent: 'Педиатр',
  teacher_psychologist: 'Психолог',
  admin_parent: 'Администратор',
  psychologist_parent: 'Психолог',
};

export default function ParentChats() {
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    api.get('/chats').then(r => setChats(r.data));
    api.get('/chats/staff').then(r => setStaff(r.data));
  }, []);

  const startChat = async (staffMember: any) => {
    setCreating(true);
    try {
      const { data } = await api.post('/chats', { targetUserId: staffMember.id, type: 'teacher_parent' });
      router.push(`/parent/chats/${data.id}`);
    } catch (err: any) {
      alert('Ошибка: ' + (err?.response?.data?.message || err.message));
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageLayout title="Чаты">
      {/* Start new chat with the group teacher */}
      {staff.length > 0 && (
        <div className="bg-white border rounded-xl p-4 mb-6">
          <h3 className="font-medium text-sm text-gray-700 mb-3">Написать педагогу</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {staff.map(s => (
              <button
                key={s.id}
                onClick={() => startChat(s)}
                disabled={creating}
                className="flex items-center gap-3 border rounded-xl p-4 text-left hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer disabled:opacity-50"
              >
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-lg shrink-0">
                  👩‍🏫
                </div>
                <div>
                  <div className="font-medium text-sm text-gray-800">{s.name}</div>
                  <div className="text-xs text-gray-400">Педагог группы</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Existing chats */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <h3 className="font-medium text-sm text-gray-700">Мои диалоги</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {chats.length === 0 && <div className="px-4 py-8 text-center text-gray-400 text-sm">Нет активных чатов</div>}
          {chats.map(chat => {
            const lastMsg = chat.messages?.[0];
            return (
              <Link key={chat.id} href={`/parent/chats/${chat.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-lg shrink-0">
                  👩‍🏫
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{TYPE_LABELS[chat.type] || 'Педагог'}</span>
                    {lastMsg && <span className="text-xs text-gray-400">{new Date(lastMsg.createdAt).toLocaleDateString('ru')}</span>}
                  </div>
                  {lastMsg && <p className="text-xs text-gray-500 truncate mt-0.5">{lastMsg.sender?.name}: {lastMsg.text}</p>}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </PageLayout>
  );
}
