'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';

type ParentUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  parentChildren?: { child: { id: string; name: string; status: string; group?: { name?: string } } }[];
};

type ChildRow = {
  id: string;
  name: string;
  group?: { name?: string };
  parents?: { parent: { id: string; name: string; email: string } }[];
};

const emptyForm = { email: '', name: '', phone: '', childIds: [] as string[] };

export default function AdminParents() {
  const [parents, setParents] = useState<ParentUser[]>([]);
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    Promise.all([
      api.get('/admin/parents'),
      api.get('/admin/children'),
    ]).then(([parentsRes, childrenRes]) => {
      setParents(parentsRes.data || []);
      setChildren(childrenRes.data || []);
    });
  };

  useEffect(() => { load(); }, []);

  const childrenWithoutParents = useMemo(
    () => children.filter(child => !child.parents?.length),
    [children],
  );

  const filtered = parents.filter(parent => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [parent.name, parent.email, parent.phone]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(q));
  });

  const openForm = (parent?: ParentUser) => {
    if (parent) {
      setEditingId(parent.id);
      setForm({
        email: parent.email,
        name: parent.name,
        phone: parent.phone || '',
        childIds: parent.parentChildren?.map(link => link.child.id) || [],
      });
    } else {
      setEditingId(null);
      setForm(emptyForm);
    }
    setShowForm(true);
  };

  const toggleChild = (childId: string) => {
    setForm(prev => ({
      ...prev,
      childIds: prev.childIds.includes(childId)
        ? prev.childIds.filter(id => id !== childId)
        : [...prev.childIds, childId],
    }));
  };

  const saveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await api.put(`/admin/parents/${editingId}`, {
        email: form.email,
        name: form.name,
        phone: form.phone,
      });
    } else {
      const { data } = await api.post('/admin/parents/invite', form);
      alert(`Токен приглашения: ${data.inviteToken}`);
    }
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    load();
  };

  return (
    <PageLayout title="Родители">
      <div className="bg-white border rounded-xl p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Поиск</label>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ФИО, email, телефон..." className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button onClick={() => openForm()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">
            + Пригласить родителя
          </button>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-3">
          <span>Родителей: {parents.length}</span>
          <span>Детей без родителя: {childrenWithoutParents.length}</span>
        </div>
      </div>

      {childrenWithoutParents.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4">
          <div className="text-sm font-medium text-amber-800 mb-2">Нужно привязать родителя</div>
          <div className="flex flex-wrap gap-2">
            {childrenWithoutParents.map(child => (
              <Link key={child.id} href={`/admin/children/${child.id}`} className="text-xs bg-white border border-amber-100 text-amber-800 px-2 py-1 rounded-full hover:bg-amber-100">
                {child.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={saveForm} className="bg-white border rounded-xl p-4 mb-4 space-y-4">
          <h3 className="font-medium">{editingId ? 'Редактировать родителя' : 'Пригласить родителя'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="ФИО" className="border rounded px-3 py-2" required />
            <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email" type="email" className="border rounded px-3 py-2" required />
            <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="Телефон" className="border rounded px-3 py-2" />
          </div>

          {!editingId && (
            <div>
              <div className="text-xs font-medium text-gray-600 mb-2">Привязать детей</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto border rounded-lg p-2">
                {children.map(child => (
                  <label key={child.id} className="flex items-start gap-2 text-sm bg-gray-50 rounded-lg p-2 cursor-pointer hover:bg-gray-100">
                    <input type="checkbox" checked={form.childIds.includes(child.id)} onChange={() => toggleChild(child.id)} className="mt-1" />
                    <span>
                      <span className="font-medium block">{child.name}</span>
                      <span className="text-xs text-gray-500">{child.group?.name || 'Без группы'}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">{editingId ? 'Сохранить' : 'Пригласить'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 px-4 py-2 text-sm">Отмена</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {filtered.map(parent => (
          <div key={parent.id} className="bg-white border rounded-xl p-4">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <div className="font-medium text-gray-900">{parent.name}</div>
                <div className="text-sm text-gray-500">{parent.email}</div>
                {parent.phone && <div className="text-sm text-gray-500">{parent.phone}</div>}
              </div>
              <button onClick={() => openForm(parent)} className="self-start text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                Изменить
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {parent.parentChildren?.length ? parent.parentChildren.map(link => (
                <Link key={link.child.id} href={`/admin/children/${link.child.id}`} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full hover:bg-indigo-100">
                  {link.child.name}{link.child.group?.name ? ` · ${link.child.group.name}` : ''}
                </Link>
              )) : (
                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full">Не привязан к ребёнку</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
