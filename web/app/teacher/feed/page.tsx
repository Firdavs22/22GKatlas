'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { FeedItem, Child } from '@/lib/types';
import FileUpload from '@/components/FileUpload';

export default function TeacherFeed() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'group_news', text: '', title: '', childId: '', mediaUrl: '' });

  useEffect(() => {
    api.get('/feed').then(r => setFeed(r.data));
    api.get('/children').then(r => setChildren(r.data));
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const scope = form.type === 'child_photo' ? 'child' : 'group';
    const payload: Record<string, unknown> = { type: form.type, scope, text: form.text, title: form.title, mediaUrls: form.mediaUrl ? [form.mediaUrl] : [] };
    if (form.type === 'child_photo') payload.childId = form.childId;
    const { data } = await api.post('/feed', payload);
    setFeed(prev => [data, ...prev]);
    setShowForm(false);
    setForm({ type: 'group_news', text: '', title: '', childId: '', mediaUrl: '' });
  };

  return (
    <PageLayout title="Лента группы">
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">+ Публикация</button>
      </div>

      {showForm && (
        <form onSubmit={create} className="bg-white border rounded-xl p-4 mb-4 space-y-3">
          <select value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))} className="w-full border rounded px-3 py-2">
            <option value="group_news">Новость группы</option>
            <option value="child_photo">Фото ребёнка</option>
          </select>
          {form.type === 'child_photo' && (
            <select value={form.childId} onChange={e => setForm(p => ({...p, childId: e.target.value}))} className="w-full border rounded px-3 py-2">
              <option value="">Выберите ребёнка</option>
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} placeholder="Заголовок" className="w-full border rounded px-3 py-2" />
          <textarea value={form.text} onChange={e => setForm(p => ({...p, text: e.target.value}))} placeholder="Текст..." className="w-full border rounded px-3 py-2 h-20 resize-none" />
          <div className="mb-2">
            <FileUpload onUpload={url => setForm(p => ({ ...p, mediaUrl: url }))} label="Прикрепить фото/файл" />
            {form.mediaUrl && <div className="text-xs text-green-600 mt-1">Файл прикреплен</div>}
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">Опубликовать</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 px-4 py-2 text-sm">Отмена</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {feed.map(item => (
          <div key={item.id} className="bg-white border rounded-xl p-4">
            {item.pinned && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full mb-2 inline-block">Закреплено</span>}
            {item.title && <div className="font-medium mb-1">{item.title}</div>}
            {item.text && <p className="text-sm text-gray-600 mb-2">{item.text}</p>}
            {item.mediaUrls && item.mediaUrls.length > 0 && (
              <div className="mt-2 mb-2 rounded overflow-hidden max-h-64 flex justify-start">
                <img src={item.mediaUrls[0]} alt="Прикрепленный медиафайл" className="object-contain max-w-full h-auto max-h-64 rounded border" />
              </div>
            )}
            <div className="text-xs text-gray-400 mt-2">{item.author?.name} · {new Date(item.createdAt).toLocaleDateString('ru')}</div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
