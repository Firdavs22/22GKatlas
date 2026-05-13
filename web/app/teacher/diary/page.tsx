'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { Child, Observation } from '@/lib/types';
import FileUpload from '@/components/FileUpload';
import AuthMedia from '@/components/AuthMedia';

export default function TeacherDiary() {
  const [children, setChildren] = useState<Child[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{childId: string; text: string; visible: boolean; photos: string[]}>({ childId: '', text: '', visible: false, photos: [] });

  useEffect(() => {
    api.get('/children').then(r => { setChildren(r.data); if (r.data[0]) setForm(p => ({...p, childId: r.data[0].id})); });
  }, []);

  useEffect(() => {
    if (!form.childId) return;
    api.get(`/children/${form.childId}/observations`).then(r => setObservations(r.data));
  }, [form.childId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await api.post(`/children/${form.childId}/observations`, { 
      text: form.text, 
      visible: form.visible,
      photos: form.photos 
    });
    setObservations(prev => [data, ...prev]);
    setShowForm(false);
    setForm(p => ({...p, text: '', visible: false, photos: []}));
  };

  return (
    <PageLayout title="Дневник наблюдений">
      <div className="flex justify-between mb-4">
        <select value={form.childId} onChange={e => setForm(p => ({...p, childId: e.target.value}))} className="border rounded-lg px-3 py-2">
          {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">+ Наблюдение</button>
      </div>

      {showForm && (
        <form onSubmit={create} className="bg-white border rounded-xl p-4 mb-4 space-y-3">
          <textarea value={form.text} onChange={e => setForm(p => ({...p, text: e.target.value}))} placeholder="Опишите наблюдение..." className="w-full border rounded px-3 py-2 h-24 resize-none" required />
          <div className="mb-2">
            <FileUpload onUpload={urls => setForm(p => ({ ...p, photos: [...p.photos, ...urls] }))} label="Прикрепить фото" />
            {form.photos.length > 0 && (
              <div className="flex gap-2 mt-2">
                {form.photos.map((url, i) => (
                  <AuthMedia key={i} src={url} alt={`Photo ${i}`} className="h-16 w-16 object-cover rounded border" />
                ))}
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.visible} onChange={e => setForm(p => ({...p, visible: e.target.checked}))} />
            Видно родителям
          </label>
          <div className="flex gap-2">
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">Сохранить</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 px-4 py-2 text-sm">Отмена</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {observations.map(o => (
          <div key={o.id} className="bg-white border rounded-xl p-4">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>{new Date(o.date).toLocaleDateString('ru')}</span>
              {o.visible && <span className="text-green-600">Видно родителям</span>}
            </div>
            <p className="text-sm">{o.text}</p>
            {o.photos && o.photos.length > 0 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {o.photos.map((url, i) => (
                  <AuthMedia key={i} src={url} alt={`Наблюдение ${i}`} className="h-24 rounded border object-cover" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
