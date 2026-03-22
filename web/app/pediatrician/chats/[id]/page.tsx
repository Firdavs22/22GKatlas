'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { ChatMessage } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { io, Socket } from 'socket.io-client';

export default function PediatricianChatPage() {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get(`/chats/${id}/messages`).then(r => setMessages(r.data));
    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    const socket = io(WS_URL, { auth: { token } });
    socket.emit('joinRoom', id);
    socket.on('newMessage', (msg: ChatMessage) => setMessages(prev => [...prev, msg]));
    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [id, token]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    await api.post(`/chats/${id}/messages`, { text });
    setText('');
  };

  return (
    <PageLayout>
      <div className="flex flex-col h-[calc(100vh-140px)]">
        <div className="flex-1 overflow-y-auto space-y-2 p-4 bg-white rounded-xl border">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${msg.senderId === user?.id ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>
                {msg.senderId !== user?.id && <div className="text-xs text-gray-500 mb-1">{msg.sender?.name}</div>}
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className="mt-2 flex gap-2">
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Сообщение..." className="flex-1 border rounded-lg px-3 py-2" />
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Отправить</button>
        </form>
      </div>
    </PageLayout>
  );
}
