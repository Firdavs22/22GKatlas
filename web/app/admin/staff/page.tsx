'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { User } from '@/lib/types';

const ROLE_LABELS: Record<string, string> = { admin: 'Администратор', teacher: 'Педагог', psychologist: 'Психолог', pediatrician: 'Педиатр' };

export default function AdminStaff() {
  const [staff, setStaff] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', name: '', role: 'teacher' });

  useEffect(() => { api.get('/admin/staff').then(r => setStaff(r.data)); }, []);
  const openForm = (user?: User) => {
    if (user) {
      setEditingId(user.id);
      setForm({ email: user.email, name: user.name, role: user.role });
    } else {
      setEditingId(null);
      setForm({ email: '', name: '', role: 'teacher' });
    }
    setShowForm(true);
  };

  const saveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      // Update
      const { data } = await api.put(`/admin/staff/${editingId}`, { name: form.name, role: form.role });
      setStaff(prev => prev.map(s => s.id === editingId ? { ...s, ...data } : s));
      alert('Сотрудник обновлён');
    } else {
      // Invite
      const { data } = await api.post('/admin/staff/invite', form);
      alert(`Токен приглашения: ${data.inviteToken}`);
      api.get('/admin/staff').then(r => setStaff(r.data));
    }
    setShowForm(false);
    setEditingId(null);
    setForm({ email: '', name: '', role: 'teacher' });
  };

  return (
    <PageLayout title="Сотрудники">
      <div className="flex justify-between mb-4">
        <span className="text-gray-500">{staff.length} сотрудников</span>
        <button onClick={() => openForm()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">+ Пригласить</button>
      </div>

      {showForm && (
        <form onSubmit={saveForm} className="bg-white border rounded-xl p-4 mb-4 space-y-3">
          <h3 className="font-medium">{editingId ? 'Редактировать сотрудника' : 'Пригласить сотрудника'}</h3>
          <input value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="Email" type="email" className="w-full border rounded px-3 py-2" required disabled={!!editingId} />
          <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="ФИО" className="w-full border rounded px-3 py-2" required />
          <select value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))} className="w-full border rounded px-3 py-2">
            <option value="teacher">Педагог</option>
            <option value="psychologist">Психолог</option>
            <option value="pediatrician">Педиатр</option>
            <option value="admin">Администратор</option>
          </select>
          <div className="flex gap-2">
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">{editingId ? 'Сохранить' : 'Пригласить'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 px-4 py-2 text-sm">Отмена</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {staff.map(s => (
          <div key={s.id} className="bg-white border rounded-xl p-4 flex justify-between items-center">
            <div>
              <a href={`/admin/staff/${s.id}`} className="font-medium text-indigo-600 hover:underline inline-block">{s.name}</a>
              <div className="text-sm text-gray-500">{s.email}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">{ROLE_LABELS[s.role]}</span>
              <button onClick={() => openForm(s)} className="text-sm text-gray-600 border border-gray-200 px-2 py-1 rounded hover:bg-gray-50">Изменить</button>
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
