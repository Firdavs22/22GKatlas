'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { Observation, Child } from '@/lib/types';

export default function ParentDiary() {
  const [children, setChildren] = useState<Child[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [childId, setChildId] = useState('');

  useEffect(() => { api.get('/children').then(r => { setChildren(r.data); if (r.data[0]) setChildId(r.data[0].id); }); }, []);
  useEffect(() => { if (childId) api.get(`/children/${childId}/observations`).then(r => setObservations(r.data)); }, [childId]);

  return (
    <PageLayout title="Дневник наблюдений">
      {children.length > 1 && (
        <select value={childId} onChange={e => setChildId(e.target.value)} className="border rounded-lg px-3 py-2 mb-4">
          {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      <div className="space-y-3">
        {observations.length === 0 && <p className="text-gray-400 text-center py-8">Нет записей</p>}
        {observations.map(o => (
          <div key={o.id} className="bg-white border rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-2">{new Date(o.date).toLocaleDateString('ru')}</div>
            <p className="text-sm">{o.text}</p>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
