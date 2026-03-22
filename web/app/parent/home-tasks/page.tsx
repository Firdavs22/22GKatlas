'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { Child } from '@/lib/types';

interface HomeTask {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  completed: boolean;
  createdAt: string;
  author?: { name: string };
}

export default function ParentHomeTasks() {
  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState('');
  const [tasks, setTasks] = useState<HomeTask[]>([]);

  useEffect(() => { api.get('/children').then(r => { setChildren(r.data); if (r.data[0]) setChildId(r.data[0].id); }); }, []);
  useEffect(() => { if (childId) api.get(`/children/${childId}/home-tasks`).then(r => setTasks(r.data)); }, [childId]);

  const toggle = async (taskId: string, completed: boolean) => {
    await api.put(`/children/${childId}/home-tasks/${taskId}`, { completed: !completed });
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !completed } : t));
  };

  return (
    <PageLayout title="Рекомендации">
      {children.length > 1 && (
        <select value={childId} onChange={e => setChildId(e.target.value)} className="border rounded-lg px-3 py-2 mb-4">
          {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      <div className="space-y-2">
        {tasks.length === 0 && <p className="text-gray-400 text-center py-8">Нет рекомендаций</p>}
        {tasks.map(task => (
          <div key={task.id} className={`bg-white border rounded-xl p-4 flex gap-3 ${task.completed ? 'opacity-60' : ''}`}>
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => toggle(task.id, task.completed)}
              className="mt-1 w-4 h-4 accent-indigo-600"
            />
            <div className="flex-1">
              <div className={`font-medium ${task.completed ? 'line-through' : ''}`}>{task.title}</div>
              {task.description && <p className="text-sm text-gray-500 mt-1">{task.description}</p>}
              <div className="flex gap-4 mt-1 text-xs text-gray-400">
                {task.dueDate && <span>До: {new Date(task.dueDate).toLocaleDateString('ru')}</span>}
                {task.author && <span>Педагог: {task.author.name}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
