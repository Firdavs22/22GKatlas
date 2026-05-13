'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { Group, User } from '@/lib/types';
import Link from 'next/link';

export default function AdminGroups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', ageRange: '', year: new Date().getFullYear(), teacherId: '', capacity: 24, monthlyFee: 75000 });
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [groupDetail, setGroupDetail] = useState<any>(null);

  useEffect(() => {
    api.get('/admin/groups').then(r => setGroups(r.data));
    api.get('/admin/staff').then(r => setStaff(r.data.filter((u: User) => u.role === 'teacher')));
  }, []);

  const openForm = (group?: any) => {
    if (group) {
      setEditingId(group.id);
      setForm({
        name: group.name, ageRange: group.ageRange, year: group.year,
        teacherId: group.teacher?.id || group.teacherId || '',
        capacity: group.capacity || 24, monthlyFee: group.monthlyFee || 75000
      });
    } else {
      setEditingId(null);
      setForm({ name: '', ageRange: '', year: new Date().getFullYear(), teacherId: '', capacity: 24, monthlyFee: 75000 });
    }
    setShowForm(true);
    setSelectedGroup(null);
  };

  const saveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, teacherId: form.teacherId || null };
    if (editingId) {
      await api.put(`/admin/groups/${editingId}`, payload);
    } else {
      await api.post('/admin/groups', payload);
    }
    setShowForm(false);
    setEditingId(null);
    api.get('/admin/groups').then(r => setGroups(r.data));
  };

  const del = async (id: string) => {
    if (!confirm('Удалить группу? Все дети будут откреплены.')) return;
    await api.delete(`/admin/groups/${id}`);
    setGroups(prev => prev.filter(g => g.id !== id));
    if (selectedGroup === id) { setSelectedGroup(null); setGroupDetail(null); }
  };

  const openGroupDetail = async (groupId: string) => {
    setSelectedGroup(groupId);
    setShowForm(false);
    const { data } = await api.get(`/admin/groups/${groupId}`);
    setGroupDetail(data);
  };

  const getAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  return (
    <PageLayout title="Группы">
      <div className="flex justify-between mb-4">
        <span className="text-gray-500">{groups.length} групп</span>
        <button onClick={() => openForm()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">+ Создать группу</button>
      </div>

      {showForm && (
        <form onSubmit={saveForm} className="bg-white border rounded-xl p-4 mb-4 space-y-3">
          <h3 className="font-medium">{editingId ? 'Редактировать группу' : 'Новая группа'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="Название" className="border rounded px-3 py-2" required />
            <input value={form.ageRange} onChange={e => setForm(p => ({...p, ageRange: e.target.value}))} placeholder="Возраст (3-6)" className="border rounded px-3 py-2" required />
            <input type="number" value={form.year} onChange={e => setForm(p => ({...p, year: +e.target.value}))} className="border rounded px-3 py-2" required />
            <input type="number" value={form.capacity} onChange={e => setForm(p => ({...p, capacity: +e.target.value}))} placeholder="Вместимость" className="border rounded px-3 py-2" />
            <input type="number" value={form.monthlyFee} onChange={e => setForm(p => ({...p, monthlyFee: +e.target.value}))} placeholder="Стоимость/мес" className="border rounded px-3 py-2" />
            <select value={form.teacherId} onChange={e => setForm(p => ({...p, teacherId: e.target.value}))} className="border rounded px-3 py-2">
              <option value="">Нет педагога</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">{editingId ? 'Сохранить' : 'Создать'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 px-4 py-2 text-sm">Отмена</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {groups.map(g => (
          <div
            key={g.id}
            onClick={() => openGroupDetail(g.id)}
            className={`bg-white border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${selectedGroup === g.id ? 'ring-2 ring-indigo-500 border-indigo-300' : 'hover:border-indigo-200'}`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-semibold text-lg">{g.name}</div>
                <div className="text-sm text-gray-500">{g.ageRange} лет · {g.year}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); openForm(g); }} className="text-gray-400 hover:text-indigo-600 p-1" title="Редактировать">✏️</button>
                <button onClick={(e) => { e.stopPropagation(); del(g.id); }} className="text-gray-400 hover:text-red-600 p-1" title="Удалить">🗑️</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                👧 {g._count?.children || 0}/{g.capacity || 24}
              </span>
              <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full">
                💰 {(g.monthlyFee || 75000).toLocaleString()} ₽
              </span>
              {g.teacher && (
                <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                  👩‍🏫 {g.teacher.name}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Group Detail Modal */}
      {selectedGroup && groupDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setSelectedGroup(null); setGroupDetail(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{groupDetail.name}</h2>
                  <div className="text-indigo-200 mt-1">{groupDetail.ageRange} лет · {groupDetail.year} год</div>
                </div>
                <button onClick={() => { setSelectedGroup(null); setGroupDetail(null); }} className="text-white/70 hover:text-white text-2xl">✕</button>
              </div>
              <div className="flex flex-wrap gap-4 mt-4 text-sm">
                <div className="bg-white/20 backdrop-blur rounded-lg px-3 py-2">
                  👧 Детей: <strong>{groupDetail.children?.filter((c: any) => c.status === 'active').length || 0}/{groupDetail.capacity || 24}</strong>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-lg px-3 py-2">
                  👩‍🏫 Педагог: <strong>{groupDetail.teacher?.name || 'Не назначен'}</strong>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-lg px-3 py-2">
                  💰 Стоимость: <strong>{(groupDetail.monthlyFee || 75000).toLocaleString()} ₽/мес</strong>
                </div>
              </div>
            </div>

            {/* Children List */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <h3 className="font-medium text-gray-700 mb-3 text-sm uppercase tracking-wide">Список детей</h3>
              {groupDetail.children?.length === 0 ? (
                <p className="text-gray-400 text-center py-6">В группе нет детей</p>
              ) : (
                <div className="space-y-2">
                  {groupDetail.children?.filter((c: any) => c.status === 'active').map((child: any) => (
                    <Link key={child.id} href={`/admin/children/${child.id}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">
                          {child.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-indigo-600">{child.name}</div>
                          <div className="text-xs text-gray-500">{getAge(child.birthDate)} лет</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {child.extraServices?.map((s: string) => (
                          <span key={s} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{s}</span>
                        ))}
                        {child.parents?.map((p: any) => (
                          <span key={p.parent.email} className="text-xs text-gray-400">{p.parent.name}</span>
                        ))}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
