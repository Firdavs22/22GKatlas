'use client';
import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, SectionLabel } from '@/components/ui';
import api from '@/lib/api';
import { Observation, Child } from '@/lib/types';
import PostMedia from '@/components/PostMedia';

export default function ParentDiary() {
  const [children, setChildren] = useState<Child[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [childId, setChildId] = useState('');

  useEffect(() => {
    api.get('/children').then(r => {
      setChildren(r.data);
      if (r.data[0]) setChildId(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (childId) api.get(`/children/${childId}/observations`).then(r => setObservations(r.data));
  }, [childId]);

  const sorted = [...observations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <PageLayout
      eyebrow="Записи от педагогов"
      title="Дневник наблюдений"
    >
      {children.length > 1 && (
        <div className="mb-6">
          <select
            value={childId}
            onChange={e => setChildId(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      {sorted.length === 0 ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-12 text-center">
            Записи ещё не появились
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map(o => (
            <Card key={o.id} padding="md">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-pale flex items-center justify-center text-brand shrink-0 mt-0.5">
                  <Calendar size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      {new Date(o.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    {o.author?.name && (
                      <div className="text-xs text-slate-500 shrink-0">
                        {o.author.name}
                      </div>
                    )}
                  </div>
                  {o.title && <h4 className="font-serif text-lg mb-1">{o.title}</h4>}
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{o.text}</p>
                  {o.photos?.length > 0 && <PostMedia urls={o.photos} className="mt-3" />}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
