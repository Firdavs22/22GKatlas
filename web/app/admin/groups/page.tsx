'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { Group, User } from '@/lib/types';

export default function AdminGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', ageRange: '', year: new Date().getFullYear(), teacherId: '' });

  useEffect(() => { 
    api.get('/admin/groups').then(r => setGroups(r.data)); 
    api.get('/admin/staff').then(r => setStaff(r.data.filter((u: User) => u.role === 'teacher')));
  }, []);

  const openForm = (group?: Group) => {
    if (group) {
      setEditingId(group.id);
      setForm({ 
        name: group.name, 
        ageRange: group.ageRange, 
        year: group.year, 
        // @ts-ignore
        teacherId: group.teacher?.id || group.teacherId || '' 
      });
    } else {
      setEditingId(null);
      setForm({ name: '', ageRange: '', year: new Date().getFullYear(), teacherId: '' });
    }
    setShowForm(true);
  };

  const saveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, teacherId: form.teacherId || null };
    
    if (editingId) {
      const { data } = await api.put(`/admin/groups/${editingId}`, payload);
      setGroups(prev => prev.map(g => g.id === editingId ? { ...g, ...data, teacher: data.teacherId ? staff.find(s => s.id === data.teacherId) : null } : g));
    } else {
      const { data } = await api.post('/admin/groups', payload);
      setGroups(prev => [...prev, { ...data, teacher: data.teacherId ? staff.find(s => s.id === data.teacherId) : null }]);
    }
    
    setShowForm(false);
    setEditingId(null);
    setForm({ name: '', ageRange: '', year: new Date().getFullYear(), teacherId: '' });
  };

  const del = async (id: string) => {
    if (!confirm('Удалить группу?')) return;
    await api.delete(`/admin/groups/${id}`);
    setGroups(prev => prev.filter(g => g.id !== id));
  };

  return (
    <PageLayout title="Группы">
      <div className="flex justify-between mb-4">
        <span className="text-gray-500">{groups.length} групп</span>
        <button onClick={() => openForm()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">+ Создать группу</button>
      </div>

      {showForm && (
        <form onSubmit={saveForm} className="bg-white border rounded-xl p-4 mb-4 space-y-3">
          <h3 className="font-medium">{editingId ? 'Редактировать группу' : 'Новая группа'}</h3>
          <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="Название" className="w-full border rounded px-3 py-2" required />
          <input value={form.ageRange} onChange={e => setForm(p => ({...p, ageRange: e.target.value}))} placeholder="Возраст (напр. 3-6)" className="w-full border rounded px-3 py-2" required />
          <input type="number" value={form.year} onChange={e => setForm(p => ({...p, year: +e.target.value}))} className="w-full border rounded px-3 py-2" required />
          <select value={form.teacherId} onChange={e => setForm(p => ({...p, teacherId: e.target.value}))} className="w-full border rounded px-3 py-2">
            <option value="">Нет педагога</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex gap-2">
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">{editingId ? 'Сохранить' : 'Создать'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 px-4 py-2 text-sm">Отмена</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {groups.map(g => (
          <div key={g.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{g.name}</div>
              <div className="text-sm text-gray-500">{g.ageRange} лет · {g.year} год · {g._count?.children || 0} детей</div>
              {g.teacher && <div className="text-sm text-indigo-600">Педагог: {g.teacher.name}</div>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => openForm(g)} className="text-indigo-600 hover:text-indigo-800 text-sm">Изменить</button>
              <button onClick={() => del(g.id)} className="text-red-500 hover:text-red-700 text-sm">Удалить</button>
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
