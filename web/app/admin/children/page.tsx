'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { Child, Group, User } from '@/lib/types';
import Link from 'next/link';

const EXTRA_SERVICES_OPTIONS = ['Логопед', 'Хореография', 'Музыка', 'Английский', 'Рисование', 'Плавание', 'Шахматы', 'Робототехника'];
const emptyParentLink = () => ({ id: '', name: '', email: '', phone: '' });

export default function AdminChildren() {
  const [children, setChildren] = useState<any[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ name: '', birthDate: '', parentLinks: [emptyParentLink()], contacts: [], representatives: [], extraServices: [], allergies: '', documents: {}, notes: '' });

  // Filters
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterAge, setFilterAge] = useState('all');

  useEffect(() => {
    api.get('/admin/children').then(r => setChildren(r.data));
    api.get('/admin/groups').then(r => setGroups(r.data));
    api.get('/admin/staff').then(r => setStaff(r.data.filter((s: User) => ['psychologist', 'pediatrician', 'teacher'].includes(s.role))));
  }, []);

  const openForm = (child?: any) => {
    if (child) {
      setEditingId(child.id);
      setForm({
        name: child.name,
        birthDate: child.birthDate?.split('T')[0] || '',
        contacts: child.contacts || [],
        parentLinks: child.parents?.length
          ? child.parents.map((link: any) => ({
            id: link.parent?.id || '',
            name: link.parent?.name || '',
            email: link.parent?.email || '',
            phone: link.parent?.phone || '',
          }))
          : [emptyParentLink()],
        representatives: child.representatives || [],
        extraServices: child.extraServices || [],
        allergies: child.allergies || '',
        documents: child.documents || {},
        notes: child.notes || '',
      });
    } else {
      setEditingId(null);
      setForm({ name: '', birthDate: '', parentLinks: [emptyParentLink()], contacts: [], representatives: [], extraServices: [], allergies: '', documents: {}, notes: '' });
    }
    setShowForm(true);
  };

  const saveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/admin/children/${editingId}`, form);
      } else {
        await api.post('/admin/children', form);
      }
      setShowForm(false);
      setEditingId(null);
      api.get('/admin/children').then(r => setChildren(r.data));
    } catch (err: any) {
      alert('Ошибка: ' + (err?.response?.data?.message || err.message));
    }
  };

  const enroll = async (childId: string, groupId: string) => {
    await api.post(`/admin/children/${childId}/enroll`, { groupId });
    api.get('/admin/children').then(r => setChildren(r.data));
  };

  const archive = async (childId: string) => {
    if (!confirm('Отчислить ребёнка?')) return;
    await api.delete(`/admin/children/${childId}`);
    setChildren(prev => prev.map(c => c.id === childId ? { ...c, status: 'left' } : c));
  };

  const toggleService = (service: string) => {
    setForm((prev: any) => ({
      ...prev,
      extraServices: prev.extraServices.includes(service)
        ? prev.extraServices.filter((s: string) => s !== service)
        : [...prev.extraServices, service]
    }));
  };

  const addContact = () => setForm((p: any) => ({ ...p, contacts: [...p.contacts, { name: '', phone: '', relation: '' }] }));
  const removeContact = (i: number) => setForm((p: any) => ({ ...p, contacts: p.contacts.filter((_: any, idx: number) => idx !== i) }));
  const updateContact = (i: number, field: string, val: string) => {
    setForm((p: any) => ({ ...p, contacts: p.contacts.map((c: any, idx: number) => idx === i ? { ...c, [field]: val } : c) }));
  };

  const addParentLink = () => setForm((p: any) => ({ ...p, parentLinks: [...p.parentLinks, emptyParentLink()] }));
  const removeParentLink = (i: number) => setForm((p: any) => ({ ...p, parentLinks: p.parentLinks.length > 1 ? p.parentLinks.filter((_: any, idx: number) => idx !== i) : p.parentLinks }));
  const updateParentLink = (i: number, field: string, val: string) => {
    setForm((p: any) => ({ ...p, parentLinks: p.parentLinks.map((parent: any, idx: number) => idx === i ? { ...parent, [field]: val } : parent) }));
  };

  const addRep = () => setForm((p: any) => ({ ...p, representatives: [...p.representatives, { name: '', phone: '', relation: '' }] }));
  const removeRep = (i: number) => setForm((p: any) => ({ ...p, representatives: p.representatives.filter((_: any, idx: number) => idx !== i) }));
  const updateRep = (i: number, field: string, val: string) => {
    setForm((p: any) => ({ ...p, representatives: p.representatives.map((c: any, idx: number) => idx === i ? { ...c, [field]: val } : c) }));
  };

  const getAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const formatParents = (child: any) => {
    const names = (child.parents || [])
      .map((link: any) => link.parent?.name || link.parent?.email)
      .filter(Boolean);
    return names.length ? names.join(', ') : '';
  };

  const filtered = children.filter(c => {
    if (c.status === 'left') return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterGroup !== 'all') {
      if (filterGroup === 'none' && c.groupId) return false;
      if (filterGroup !== 'none' && c.groupId !== filterGroup) return false;
    }
    if (filterAge !== 'all') {
      const age = getAge(c.birthDate);
      const [min, max] = filterAge.split('-').map(Number);
      if (age < min || age > max) return false;
    }
    return true;
  });

  return (
    <PageLayout title="Дети">
      {/* Toolbar */}
      <div className="bg-white border rounded-xl p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Поиск</label>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Имя ребёнка..." className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Группа</label>
            <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="all">Все группы</option>
              <option value="none">Без группы</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Возраст</label>
            <select value={filterAge} onChange={e => setFilterAge(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="all">Все</option>
              <option value="1-2">1-2</option><option value="2-3">2-3</option>
              <option value="3-4">3-4</option><option value="4-5">4-5</option>
              <option value="5-6">5-6</option><option value="6-7">6-7</option>
            </select>
          </div>
          <button onClick={() => openForm()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 whitespace-nowrap">+ Добавить</button>
        </div>
        <div className="text-xs text-gray-400 mt-2">Найдено: {filtered.length}</div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <form onSubmit={saveForm}>
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-lg">{editingId ? 'Редактировать' : 'Новый ребёнок'}</h3>
                  <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ФИО *</label>
                    <input value={form.name} onChange={e => setForm((p: any) => ({...p, name: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Дата рождения *</label>
                    <input type="date" value={form.birthDate} onChange={e => setForm((p: any) => ({...p, birthDate: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm" required />
                  </div>
                </div>

                {/* Parents */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-medium text-gray-600">Родители *</label>
                    <button type="button" onClick={addParentLink} className="text-xs text-indigo-600 hover:underline">+ Добавить родителя</button>
                  </div>
                  <div className="space-y-2">
                    {form.parentLinks.map((parent: any, i: number) => (
                      <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 bg-gray-50 border rounded-lg p-3">
                        <input value={parent.name} onChange={e => updateParentLink(i, 'name', e.target.value)} placeholder="ФИО родителя" className="border rounded px-2 py-1.5 text-xs" required />
                        <input value={parent.email} onChange={e => updateParentLink(i, 'email', e.target.value)} placeholder="Email для входа" type="email" className="border rounded px-2 py-1.5 text-xs" required disabled={!!parent.id} />
                        <input value={parent.phone} onChange={e => updateParentLink(i, 'phone', e.target.value)} placeholder="Телефон" className="border rounded px-2 py-1.5 text-xs" />
                        <button type="button" onClick={() => removeParentLink(i)} className="text-red-400 hover:text-red-600 px-2" title="Убрать родителя">✕</button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Родитель создаётся как пользователь с ролью «Родитель» и привязывается к ребёнку.</p>
                </div>

                {/* Extra Services */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Доп. услуги</label>
                  <div className="flex flex-wrap gap-2">
                    {EXTRA_SERVICES_OPTIONS.map(s => (
                      <button key={s} type="button" onClick={() => toggleService(s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${form.extraServices.includes(s) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >{s}</button>
                    ))}
                  </div>
                </div>

                {/* Allergies */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Аллергии / Особенности здоровья</label>
                  <textarea value={form.allergies} onChange={e => setForm((p: any) => ({...p, allergies: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm h-16" placeholder="Аллергия на орехи, лактозу..." />
                </div>

                {/* Contacts */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-medium text-gray-600">Контакты</label>
                    <button type="button" onClick={addContact} className="text-xs text-indigo-600 hover:underline">+ Добавить контакт</button>
                  </div>
                  {form.contacts.map((c: any, i: number) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input value={c.name} onChange={e => updateContact(i, 'name', e.target.value)} placeholder="Имя" className="flex-1 border rounded px-2 py-1.5 text-xs" />
                      <input value={c.phone} onChange={e => updateContact(i, 'phone', e.target.value)} placeholder="Телефон" className="flex-1 border rounded px-2 py-1.5 text-xs" />
                      <input value={c.relation} onChange={e => updateContact(i, 'relation', e.target.value)} placeholder="Кем приходится" className="flex-1 border rounded px-2 py-1.5 text-xs" />
                      <button type="button" onClick={() => removeContact(i)} className="text-red-400 hover:text-red-600">✕</button>
                    </div>
                  ))}
                </div>

                {/* Representatives */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-medium text-gray-600">Представители (кто может забирать)</label>
                    <button type="button" onClick={addRep} className="text-xs text-indigo-600 hover:underline">+ Добавить</button>
                  </div>
                  {form.representatives.map((c: any, i: number) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input value={c.name} onChange={e => updateRep(i, 'name', e.target.value)} placeholder="Имя" className="flex-1 border rounded px-2 py-1.5 text-xs" />
                      <input value={c.phone} onChange={e => updateRep(i, 'phone', e.target.value)} placeholder="Телефон" className="flex-1 border rounded px-2 py-1.5 text-xs" />
                      <input value={c.relation} onChange={e => updateRep(i, 'relation', e.target.value)} placeholder="Кем приходится" className="flex-1 border rounded px-2 py-1.5 text-xs" />
                      <button type="button" onClick={() => removeRep(i)} className="text-red-400 hover:text-red-600">✕</button>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Заметки</label>
                  <textarea value={form.notes} onChange={e => setForm((p: any) => ({...p, notes: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm h-16" placeholder="Документы, особые пожелания, комментарии..." />
                </div>
              </div>
              <div className="p-6 border-t flex gap-3">
                <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-indigo-700">{editingId ? 'Сохранить' : 'Добавить'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Children Table */}
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ФИО</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Возраст</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Группа</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Родители</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Контакты</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Доп. услуги</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Нет детей</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/children/${c.id}`} className="font-medium text-sm text-indigo-600 hover:underline">{c.name}</Link>
                  <div className="text-xs text-gray-400">{new Date(c.birthDate).toLocaleDateString('ru')}</div>
                </td>
                <td className="px-3 py-3 text-sm text-gray-600">{getAge(c.birthDate)} лет</td>
                <td className="px-3 py-3">
                  <select value={c.groupId || ''} onChange={e => { if (e.target.value) enroll(c.id, e.target.value); }} className="text-xs border rounded px-2 py-1 bg-gray-50 max-w-[120px]">
                    <option value="">—</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </td>
                <td className="px-3 py-3 text-xs text-gray-600 max-w-[120px]">
                  {formatParents(c) || <span className="text-amber-600">Нужно добавить</span>}
                </td>
                <td className="px-3 py-3 text-xs text-gray-500 max-w-[120px]">
                  {c.contacts?.length > 0
                    ? c.contacts.map((ct: any) => ct.phone).join(', ')
                    : <span className="text-gray-300">—</span>
                  }
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {c.extraServices?.length > 0
                      ? c.extraServices.map((s: string) => (
                        <span key={s} className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">{s}</span>
                      ))
                      : <span className="text-xs text-gray-300">—</span>
                    }
                  </div>
                </td>
                <td className="px-3 py-3 text-right whitespace-nowrap">
                  <Link href={`/admin/children/${c.id}`} title="Карточка ребёнка" className="text-indigo-500 hover:text-indigo-700 p-1">📋</Link>
                  <button onClick={() => openForm(c)} title="Редактировать" className="text-gray-400 hover:text-gray-600 p-1">✏️</button>
                  <button onClick={() => archive(c.id)} title="Отчислить" className="text-red-400 hover:text-red-600 p-1">🚫</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageLayout>
  );
}
