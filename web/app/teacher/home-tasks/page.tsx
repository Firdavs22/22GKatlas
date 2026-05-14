'use client';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, Badge } from '@/components/ui';
import api from '@/lib/api';
import { Child, SkillGroup } from '@/lib/types';

interface HomeTask {
  id: string;
  childId: string;
  skillId: string;
  title: string;
  description: string | null;
  status: 'pending' | 'done';
  createdAt: string;
  updatedAt: string;
  skill?: { id: string; title: string };
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] || '';
  return `${parts[0]} ${parts[1].charAt(0)}.`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export default function TeacherHomeTasks() {
  const [children, setChildren] = useState<Child[]>([]);
  const [skillGroups, setSkillGroups] = useState<SkillGroup[]>([]);
  const [tasks, setTasks] = useState<(HomeTask & { childName?: string })[]>([]);

  // Form
  const [formOpen, setFormOpen] = useState(false);
  const [formChildId, setFormChildId] = useState('');
  const [formSkillId, setFormSkillId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/children').then(r => {
      setChildren(r.data);
      if (r.data[0]) setFormChildId(r.data[0].id);
    });
    api.get('/admin/skill-groups').then(r => setSkillGroups(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (children.length === 0) return;
    Promise.all(
      children.map(c =>
        api
          .get(`/children/${c.id}/home-tasks`)
          .then(r => (r.data as HomeTask[]).map(t => ({ ...t, childName: c.name })))
          .catch(() => []),
      ),
    ).then(lists => {
      const merged = lists
        .flat()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setTasks(merged);
    });
  }, [children]);

  const skillIndex = useMemo(() => {
    const m = new Map<string, { title: string; group: string }>();
    for (const g of skillGroups) {
      for (const s of g.skills || []) {
        m.set(s.id, { title: s.title, group: g.title });
      }
    }
    return m;
  }, [skillGroups]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formChildId || !formSkillId || !formTitle.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.post(`/children/${formChildId}/home-tasks`, {
        skillId: formSkillId,
        title: formTitle,
        description: formDescription,
      });
      const childName = children.find(c => c.id === formChildId)?.name;
      setTasks(prev => [{ ...data, childName }, ...prev]);
      setFormOpen(false);
      setFormSkillId('');
      setFormTitle('');
      setFormDescription('');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (task: HomeTask) => {
    if (!confirm('Удалить рекомендацию?')) return;
    await api.delete(`/children/${task.childId}/home-tasks/${task.id}`);
    setTasks(prev => prev.filter(t => t.id !== task.id));
  };

  return (
    <PageLayout
      eyebrow="Домашние рекомендации"
      title="Задания родителям"
      wide
      actions={
        <Button variant="primary" size="sm" onClick={() => setFormOpen(v => !v)}>
          <Plus size={16} />
          Назначить
        </Button>
      }
    >
      {formOpen && (
        <Card padding="md" className="mb-6">
          <h3 className="font-serif text-xl mb-4">Новая рекомендация</h3>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Ребёнок
              </label>
              <select
                value={formChildId}
                onChange={e => setFormChildId(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                {children.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Навык
              </label>
              <select
                value={formSkillId}
                onChange={e => {
                  const id = e.target.value;
                  const sk = skillIndex.get(id);
                  setFormSkillId(id);
                  if (sk && !formTitle) setFormTitle(`Повторить: ${sk.title}`);
                }}
                required
                className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                <option value="" disabled>Выберите навык</option>
                {skillGroups.map(g => g.skills?.length ? (
                  <optgroup key={g.id} label={g.title}>
                    {g.skills.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </optgroup>
                ) : null)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Задание
              </label>
              <input
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                required
                placeholder="Перелить воду из кувшина…"
                className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Описание
              </label>
              <textarea
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                rows={3}
                placeholder="Инструкции для родителей…"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Сохранение…' : 'Назначить'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Отмена
              </Button>
            </div>
          </form>
        </Card>
      )}

      {tasks.length === 0 ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-12 text-center">
            Активных рекомендаций нет
          </div>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/40">
                  <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-5 py-3">
                    Ребёнок
                  </th>
                  <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-5 py-3">
                    Задание
                  </th>
                  <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-5 py-3">
                    Навык
                  </th>
                  <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-5 py-3">
                    Срок
                  </th>
                  <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-5 py-3">
                    Статус
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map(t => {
                  const done = t.status === 'done';
                  return (
                    <tr key={t.id}>
                      <td className="px-5 py-4 font-medium">{shortName(t.childName || '')}</td>
                      <td className="px-5 py-4">
                        <div className="text-sm">{t.title}</div>
                        {t.description && (
                          <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {t.description}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {t.skill?.title ? (
                          <Badge tone="brand">{t.skill.title}</Badge>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-500">{formatDate(t.updatedAt)}</td>
                      <td className="px-5 py-4">
                        <Badge tone={done ? 'success' : 'warn'} dot>
                          {done ? 'выполнено' : 'в работе'}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => remove(t)}
                          className="text-slate-400 hover:text-danger transition-colors"
                          title="Удалить"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageLayout>
  );
}
