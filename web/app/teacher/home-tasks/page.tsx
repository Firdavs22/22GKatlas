'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { Child, SkillGroup } from '@/lib/types';

interface HomeTask {
  id: string;
  childId: string;
  skillId: string;
  title: string;
  description: string | null;
  status: 'pending' | 'done';
  skill: { id: string; title: string };
}

export default function TeacherHomeTasks() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  
  const [tasks, setTasks] = useState<HomeTask[]>([]);
  const [groups, setGroups] = useState<SkillGroup[]>([]);
  
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ skillId: '', title: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/children').then(r => {
      setChildren(r.data);
      if (r.data[0]) setSelectedChild(r.data[0].id);
    });
    // Fetch skill groups with skills for the select dropdown
    api.get('/admin/skill-groups').then(r => setGroups(r.data));
  }, []);

  const reloadTasks = () => {
    if (!selectedChild) return;
    api.get(`/children/${selectedChild}/home-tasks`).then(r => setTasks(r.data));
  };

  useEffect(() => { reloadTasks(); }, [selectedChild]);

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild || !form.skillId || !form.title) return;
    
    setSaving(true);
    try {
      await api.post(`/children/${selectedChild}/home-tasks`, form);
      setShowForm(false);
      setForm({ skillId: '', title: '', description: '' });
      reloadTasks();
    } catch {
      alert('Ошибка при создании задания');
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Удалить эту рекомендацию?')) return;
    try {
      await api.delete(`/children/${selectedChild}/home-tasks/${id}`);
      reloadTasks();
    } catch {
      alert('Ошибка при удалении');
    }
  };

  return (
    <PageLayout title="Рекомендации родителям">
      <div className="bg-white border rounded-xl p-4 mb-6 flex gap-4 items-center">
        <label className="font-medium text-gray-700">Ученик:</label>
        <select 
          value={selectedChild} 
          onChange={e => setSelectedChild(e.target.value)} 
          className="border rounded-lg px-3 py-2 w-64"
        >
          {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        
        <button 
          onClick={() => setShowForm(true)}
          className="ml-auto bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          + Добавить
        </button>
      </div>

      {showForm && (
        <form onSubmit={createTask} className="bg-white border rounded-xl p-6 mb-6">
          <h3 className="font-medium text-lg mb-4">Новая рекомендация</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Навык</label>
              <select 
                required
                value={form.skillId} 
                onChange={e => {
                  const s = e.target.value;
                  const skillName = e.target.options[e.target.selectedIndex].text;
                  setForm(p => ({...p, skillId: s, title: p.title || `Повторить: ${skillName}`}));
                }}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="" disabled>Выберите навык для закрепления</option>
                {groups.map(g => {
                  if (!g.skills?.length) return null;
                  return (
                    <optgroup key={g.id} label={g.title}>
                      {g.skills.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </optgroup>
                  );
                })}
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Что рекомендуем сделать?</label>
              <input 
                type="text" 
                required
                value={form.title}
                onChange={e => setForm(p => ({...p, title: e.target.value}))}
                className="w-full border rounded-lg px-3 py-2" 
                placeholder="Что нужно сделать?"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Описание (опционально)</label>
              <textarea 
                value={form.description}
                onChange={e => setForm(p => ({...p, description: e.target.value}))}
                className="w-full border rounded-lg px-3 py-2 h-24"
                placeholder="Дополнительные инструкции для родителей..."
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Сохранение...' : 'Добавить'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg border hover:bg-gray-50 text-gray-700">
              Отмена
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4">
        {tasks.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center text-gray-500">
            Нет активных рекомендаций
          </div>
        ) : tasks.map(task => (
          <div key={task.id} className="bg-white border rounded-xl p-4 flex gap-4 items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h4 className="font-medium text-gray-900">{task.title}</h4>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  task.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {task.status === 'done' ? 'Выполнено' : 'В процессе'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-2">Навык: {task.skill?.title}</p>
              {task.description && <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{task.description}</p>}
            </div>
            <button 
              onClick={() => deleteTask(task.id)}
              className="text-gray-400 hover:text-red-500 p-2"
              title="Удалить"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
