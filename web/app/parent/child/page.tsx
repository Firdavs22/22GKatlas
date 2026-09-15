'use client';

import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import ChildProfileCard, { ChildLike } from '@/components/ChildProfileCard';
import ChildDocuments from '@/components/ChildDocuments';
import api from '@/lib/api';

export default function ParentChildPage() {
  const [children, setChildren] = useState<{ id: string; name: string }[] | null>(null);
  const [selected, setSelected] = useState('');
  const [child, setChild] = useState<ChildLike | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    api.get('/children', { signal: controller.signal }).then(({ data }) => {
      setChildren(data); setSelected(data[0]?.id || '');
    }).catch(() => { if (!controller.signal.aborted) setError('Не удалось загрузить список детей. Обновите страницу.'); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    setChild(null); setError('');
    api.get(`/children/${selected}`, { signal: controller.signal }).then(({ data }) => setChild(data))
      .catch(() => { if (!controller.signal.aborted) setError('Не удалось открыть карточку ребенка. Обновите страницу.'); });
    return () => controller.abort();
  }, [selected]);

  return <PageLayout title="Карточка ребенка">
    {children && children.length > 1 && <label className="block text-sm mb-4">Ребенок<select className="block mt-2 w-full max-w-md rounded-xl border border-slate-200 p-3" value={selected} onChange={e => { setChild(null); setSelected(e.target.value); }}>{children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
    {error && <p role="alert" className="text-sm text-red-700 mb-4">{error}</p>}
    {!error && (!children || (selected && !child)) && <p className="text-slate-500">Загрузка…</p>}
    {children?.length === 0 && <p className="text-slate-500">К вашему аккаунту пока не привязан ребенок. Обратитесь к администрации.</p>}
    {child?.id === selected && <><h2 className="font-serif text-xl mb-4">{child.name}</h2><ChildProfileCard child={child} /><ChildDocuments key={selected} childId={selected} /></>}
  </PageLayout>;
}
