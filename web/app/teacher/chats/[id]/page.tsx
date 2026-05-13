'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { WS_URL } from '@/lib/network';
import { ChatMessage } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { io, Socket } from 'socket.io-client';
import FileUpload from '@/components/FileUpload';
import AuthMedia from '@/components/AuthMedia';

export default function TeacherChatPage() {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get(`/chats/${id}/messages`).then(r => setMessages(r.data));
    const socket = io(WS_URL, { auth: { token } });
    socket.emit('joinRoom', id);
    socket.on('newMessage', (msg: ChatMessage) => setMessages(prev => [...prev, msg]));
    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [id, token]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && attachments.length === 0) return;
    await api.post(`/chats/${id}/messages`, { text, attachments });
    setText('');
    setAttachments([]);
  };

  return (
    <PageLayout>
      <div className="flex flex-col h-[calc(100vh-140px)]">
        <div className="flex-1 overflow-y-auto space-y-2 p-4 bg-white rounded-xl border">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${msg.senderId === user?.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900 border'}`}>
                {msg.senderId !== user?.id && <div className="text-xs text-gray-500 mb-1 font-medium">{msg.sender?.name}</div>}
                {msg.text && <div>{msg.text}</div>}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-1 flex flex-col gap-1">
                    {msg.attachments.map((url, i) => (
                      <AuthMedia key={i} src={url} alt="Attachment" className="rounded bg-white p-0.5 object-contain max-h-48" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="mt-2">
          {attachments.length > 0 && (
            <div className="flex gap-2 mb-2 p-2 bg-gray-50 rounded-lg overflow-x-auto">
              {attachments.map((url, i) => (
                <div key={i} className="relative h-12 w-12 flex-shrink-0">
                  <AuthMedia src={url} alt="Прикрепленный файл" className="h-full w-full object-cover rounded border" />
                </div>
              ))}
            </div>
          )}
          <form onSubmit={send} className="flex gap-2">
            <div className="shrink-0 w-12 h-10 overflow-hidden rounded-lg flex items-center justify-center bg-gray-100 border hover:bg-gray-200">
              <FileUpload onUpload={urls => setAttachments(p => [...p, ...urls])} label="📎" />
            </div>
            <input value={text} onChange={e => setText(e.target.value)} placeholder="Сообщение..." className="flex-1 border rounded-lg px-3 py-2" />
            <button type="submit" disabled={!text.trim() && attachments.length === 0} className="bg-indigo-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">Отправить</button>
          </form>
        </div>
      </div>
    </PageLayout>
  );
}
