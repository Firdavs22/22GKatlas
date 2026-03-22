'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { Child, Group, User } from '@/lib/types';

export default function AdminChildren() {
  const [children, setChildren] = useState<Child[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', birthDate: '' });

  useEffect(() => {
    api.get('/admin/children').then(r => setChildren(r.data));
    api.get('/admin/groups').then(r => setGroups(r.data));
    api.get('/admin/staff').then(r => setStaff(r.data.filter((s: User) => s.role === 'psychologist' || s.role === 'pediatrician')));
  }, []);

  const openForm = (child?: Child) => {
    if (child) {
      setEditingId(child.id);
      setForm({ name: child.name, birthDate: child.birthDate.split('T')[0] });
    } else {
      setEditingId(null);
      setForm({ name: '', birthDate: '' });
    }
    setShowForm(true);
  };

  const saveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const { data } = await api.put(`/admin/children/${editingId}`, form);
      setChildren(prev => prev.map(c => c.id === editingId ? { ...c, ...data } : c));
    } else {
      const { data } = await api.post('/admin/children', form);
      setChildren(prev => [...prev, data]);
    }
    setShowForm(false);
    setEditingId(null);
    setForm({ name: '', birthDate: '' });
  };

  const enroll = async (childId: string, groupId: string) => {
    await api.post(`/admin/children/${childId}/enroll`, { groupId });
    setChildren(prev => prev.map(c => c.id === childId ? { ...c, groupId } : c));
  };

  const inviteParent = async (childId: string) => {
    const email = prompt('Email родителя:');
    if (!email) return;
    const { data } = await api.post(`/admin/children/${childId}/invite-parent`, { email });
    alert(`Токен приглашения: ${data.inviteToken}`);
  };

  const assignSpecialist = async (childId: string, specialistId: string) => {
    const specialist = staff.find(s => s.id === specialistId);
    if (!specialist) return;
    await api.post(`/admin/children/${childId}/assign-specialist`, { specialistId, role: specialist.role });
    alert(`Специалист ${specialist.name} назначен`);
  };

  return (
    <PageLayout title="Дети">
      <div className="flex justify-between mb-4">
        <span className="text-gray-500">{children.length} детей</span>
        <button onClick={() => openForm()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">+ Добавить ребёнка</button>
      </div>

      {showForm && (
        <form onSubmit={saveForm} className="bg-white border rounded-xl p-4 mb-4 space-y-3">
          <h3 className="font-medium">{editingId ? 'Редактировать профиль' : 'Новый ребёнок'}</h3>
          <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="ФИО" className="w-full border rounded px-3 py-2" required />
          <input type="date" value={form.birthDate} onChange={e => setForm(p => ({...p, birthDate: e.target.value}))} className="w-full border rounded px-3 py-2" required />
          <div className="flex gap-2">
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">{editingId ? 'Сохранить' : 'Добавить'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 px-4 py-2 text-sm">Отмена</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {children.map(c => (
          <div key={c.id} className="bg-white border rounded-xl p-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <a href={`/admin/children/${c.id}`} className="font-medium text-indigo-600 hover:underline">{c.name}</a>
                <div className="text-sm text-gray-500">{new Date(c.birthDate).toLocaleDateString('ru')}</div>
                {c.group && <div className="text-sm text-indigo-600">Группа: {c.group.name}</div>}
              </div>
              <div className="flex flex-wrap gap-2 items-start sm:items-end sm:justify-end max-w-sm">
                <select onChange={e => { if(e.target.value) enroll(c.id, e.target.value); e.target.value=""; }} defaultValue="" className="text-xs border rounded px-2 py-1.5 bg-gray-50">
                  <option value="">Зачислить в группу...</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <select onChange={e => { if(e.target.value) assignSpecialist(c.id, e.target.value); e.target.value=""; }} defaultValue="" className="text-xs border rounded px-2 py-1.5 bg-gray-50">
                  <option value="">Назначить специалиста...</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                </select>
                <button onClick={() => inviteParent(c.id)} className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded px-2 py-1.5 text-xs font-medium border border-indigo-200">Пригласить родителя</button>
                <button onClick={() => openForm(c)} className="text-gray-600 bg-gray-100 hover:bg-gray-200 rounded px-2 py-1.5 text-xs font-medium border border-gray-200">Изменить</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
