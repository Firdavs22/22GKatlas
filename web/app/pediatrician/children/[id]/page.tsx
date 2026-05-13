'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import ChildProfileCard from '@/components/ChildProfileCard';
import api from '@/lib/api';
import { SpecialistNote } from '@/lib/types';

const VISIBILITY: Record<string, string> = { specialist_only: 'Только я', with_teacher: 'Педагог', with_parent: 'Родитель' };
const NOTE_TYPES: Record<string, string> = { checkup: 'Осмотр', referral: 'Направление', vaccination: 'Вакцинация', observation: 'Наблюдение' };

export default function PediatricianChild() {
  const { id } = useParams<{ id: string }>();
  const [child, setChild] = useState<any>(null);
  const [notes, setNotes] = useState<SpecialistNote[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'checkup', text: '', recommendations: '', visibility: 'specialist_only' });

  useEffect(() => {
    api.get(`/children/${id}`).then(r => setChild(r.data));
    api.get(`/children/${id}/notes`).then(r => setNotes(r.data));
  }, [id]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await api.post(`/children/${id}/notes`, form);
    setNotes(prev => [data, ...prev]);
    setShowForm(false);
    setForm({ type: 'checkup', text: '', recommendations: '', visibility: 'specialist_only' });
  };

  return (
    <PageLayout title={child?.name || 'Пациент'}>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">+ Запись</button>
      </div>

      <ChildProfileCard child={child} />

      {showForm && (
        <form onSubmit={create} className="bg-white border rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))} className="border rounded px-3 py-2">
              {Object.entries(NOTE_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={form.visibility} onChange={e => setForm(p => ({...p, visibility: e.target.value}))} className="border rounded px-3 py-2">
              {Object.entries(VISIBILITY).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <textarea value={form.text} onChange={e => setForm(p => ({...p, text: e.target.value}))} placeholder="Запись..." className="w-full border rounded px-3 py-2 h-24 resize-none" required />
          <textarea value={form.recommendations} onChange={e => setForm(p => ({...p, recommendations: e.target.value}))} placeholder="Рекомендации..." className="w-full border rounded px-3 py-2 h-16 resize-none" />
          <div className="flex gap-2">
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">Сохранить</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 px-4 py-2 text-sm">Отмена</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {notes.map(n => (
          <div key={n.id} className="bg-white border rounded-xl p-4">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>{NOTE_TYPES[n.type] || n.type}</span>
              <span>{VISIBILITY[n.visibility] || n.visibility}</span>
            </div>
            <p className="text-sm">{n.text}</p>
            {n.recommendations && <p className="text-sm text-gray-500 mt-2 border-t pt-2">Рекомендации: {n.recommendations}</p>}
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
