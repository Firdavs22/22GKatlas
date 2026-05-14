'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import { Card, Badge } from '@/components/ui';
import api from '@/lib/api';
import { Child } from '@/lib/types';

interface HomeTask {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'done';
  createdAt: string;
  updatedAt: string;
  skill?: { id: string; title: string };
  dueDate?: string;
  author?: { name: string };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export default function HomeTasksPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState('');
  const [tasks, setTasks] = useState<HomeTask[]>([]);

  useEffect(() => {
    api.get('/children').then(r => {
      setChildren(r.data);
      if (r.data[0]) setChildId(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!childId) return;
    api.get(`/children/${childId}/home-tasks`).then(r => setTasks(r.data));
  }, [childId]);

  const toggle = async (task: HomeTask) => {
    const next: HomeTask['status'] = task.status === 'done' ? 'pending' : 'done';
    await api.put(`/children/${childId}/home-tasks/${task.id}`, {
      completed: next === 'done',
    });
    setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, status: next } : t)));
  };

  return (
    <PageLayout eyebrow="От педагога" title="Домашние рекомендации">
      {children.length > 1 && (
        <div className="mb-4">
          <select
            value={childId}
            onChange={e => setChildId(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      {tasks.length === 0 ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-12 text-center">
            Рекомендаций пока нет
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map(t => {
            const done = t.status === 'done';
            return (
              <button key={t.id} onClick={() => toggle(t)} className="text-left">
                <Card
                  padding="md"
                  className={`hover:border-brand transition-colors w-full ${done ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    {t.skill?.title ? (
                      <Badge tone="brand">{t.skill.title}</Badge>
                    ) : (
                      <span />
                    )}
                    <Badge tone={done ? 'success' : 'warn'} dot>
                      {done ? 'выполнено' : 'в работе'}
                    </Badge>
                  </div>
                  <h3 className={`font-serif text-xl mb-2 ${done ? 'line-through text-slate-500' : ''}`}>
                    {t.title}
                  </h3>
                  {t.description && (
                    <p className="text-sm text-slate-600 leading-relaxed mb-3">
                      {t.description}
                    </p>
                  )}
                  <div className="flex items-baseline justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                    <span>{t.author?.name || 'Педагог'}</span>
                    <span>
                      {t.dueDate ? `до ${formatDate(t.dueDate)}` : formatDate(t.updatedAt)}
                    </span>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}
