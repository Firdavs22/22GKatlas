'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, X, Users, GraduationCap, Wallet } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, Badge } from '@/components/ui';
import api from '@/lib/api';
import { User } from '@/lib/types';

interface GroupRow {
  id: string;
  name: string;
  ageRange: string;
  year: number;
  capacity?: number;
  monthlyFee?: number;
  teacher?: { id: string; name: string } | null;
  teacherId?: string;
  _count?: { children?: number };
}

interface GroupDetail extends GroupRow {
  children?: {
    id: string;
    name: string;
    birthDate: string;
    status: string;
    extraServices?: string[];
    parents?: { parent: { email: string; name: string } }[];
  }[];
}

const calcAge = (birthDate: string) => {
  const today = new Date();
  const b = new Date(birthDate);
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
};

export default function AdminGroups() {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', ageRange: '', year: new Date().getFullYear(),
    teacherId: '', capacity: 24, monthlyFee: 75000,
  });

  const [detail, setDetail] = useState<GroupDetail | null>(null);

  useEffect(() => {
    api.get('/admin/groups').then(r => setGroups(r.data));
    api.get('/admin/staff').then(r => setTeachers(r.data.filter((u: User) => u.role === 'teacher')));
  }, []);

  const reload = () => api.get('/admin/groups').then(r => setGroups(r.data));

  const openForm = (group?: GroupRow) => {
    if (group) {
      setEditingId(group.id);
      setForm({
        name: group.name,
        ageRange: group.ageRange,
        year: group.year,
        teacherId: group.teacher?.id || group.teacherId || '',
        capacity: group.capacity || 24,
        monthlyFee: group.monthlyFee || 75000,
      });
    } else {
      setEditingId(null);
      setForm({
        name: '', ageRange: '', year: new Date().getFullYear(),
        teacherId: '', capacity: 24, monthlyFee: 75000,
      });
    }
    setFormOpen(true);
  };

  const saveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, teacherId: form.teacherId || null };
    if (editingId) await api.put(`/admin/groups/${editingId}`, payload);
    else await api.post('/admin/groups', payload);
    setFormOpen(false);
    setEditingId(null);
    reload();
  };

  const del = async (id: string) => {
    if (!confirm('Удалить группу? Все дети будут откреплены.')) return;
    await api.delete(`/admin/groups/${id}`);
    setGroups(prev => prev.filter(g => g.id !== id));
  };

  const openDetail = async (id: string) => {
    const { data } = await api.get(`/admin/groups/${id}`);
    setDetail(data);
  };

  return (
    <PageLayout
      eyebrow={`${groups.length} ${groups.length === 1 ? 'группа' : groups.length < 5 ? 'группы' : 'групп'}`}
      title="Группы"
      actions={
        <Button variant="primary" size="sm" onClick={() => openForm()}>
          <Plus size={16} />
          Создать группу
        </Button>
      }
    >
      {formOpen && (
        <Card padding="md" className="mb-6">
          <h3 className="font-serif text-xl mb-4">
            {editingId ? 'Редактировать группу' : 'Новая группа'}
          </h3>
          <form onSubmit={saveForm} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Название"
              required
              className="h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <input
              value={form.ageRange}
              onChange={e => setForm(p => ({ ...p, ageRange: e.target.value }))}
              placeholder="Возраст (3–6)"
              required
              className="h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <input
              type="number"
              value={form.year}
              onChange={e => setForm(p => ({ ...p, year: +e.target.value }))}
              placeholder="Год"
              required
              className="h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <input
              type="number"
              value={form.capacity}
              onChange={e => setForm(p => ({ ...p, capacity: +e.target.value }))}
              placeholder="Вместимость"
              className="h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <input
              type="number"
              value={form.monthlyFee}
              onChange={e => setForm(p => ({ ...p, monthlyFee: +e.target.value }))}
              placeholder="Стоимость/мес"
              className="h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <select
              value={form.teacherId}
              onChange={e => setForm(p => ({ ...p, teacherId: e.target.value }))}
              className="h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="">Без педагога</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div className="md:col-span-3 flex gap-2">
              <Button type="submit" variant="primary">
                {editingId ? 'Сохранить' : 'Создать'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Отмена
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(g => (
          <Card
            key={g.id}
            padding="md"
            className="hover:border-brand transition-colors cursor-pointer"
            onClick={() => openDetail(g.id)}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-serif text-2xl leading-tight">{g.name}</h3>
                <div className="text-sm text-slate-500 mt-0.5">
                  {g.ageRange} лет · {g.year}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={e => { e.stopPropagation(); openForm(g); }}
                  className="p-1.5 text-slate-400 hover:text-brand transition-colors"
                  title="Редактировать"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); del(g.id); }}
                  className="p-1.5 text-slate-400 hover:text-danger transition-colors"
                  title="Удалить"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge tone="brand">
                <Users size={11} />
                {g._count?.children || 0}/{g.capacity || 24}
              </Badge>
              <Badge tone="neutral">
                <Wallet size={11} />
                {(g.monthlyFee || 75000).toLocaleString('ru-RU')} ₽
              </Badge>
              {g.teacher && (
                <Badge tone="success">
                  <GraduationCap size={11} />
                  {g.teacher.name}
                </Badge>
              )}
            </div>
          </Card>
        ))}
      </div>

      {detail && (
        <div
          className="fixed inset-0 bg-foreground/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-background rounded-3xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-brand text-white p-6 flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-brand-pale/80 mb-1">Группа</div>
                <h2 className="font-serif text-3xl leading-tight">{detail.name}</h2>
                <div className="text-sm text-brand-pale/80 mt-1">
                  {detail.ageRange} лет · {detail.year} год
                </div>
                <div className="flex flex-wrap gap-3 mt-4 text-sm">
                  <div className="bg-white/15 rounded-full px-3 py-1">
                    Детей{' '}
                    <strong>
                      {detail.children?.filter(c => c.status === 'active').length || 0}/
                      {detail.capacity || 24}
                    </strong>
                  </div>
                  <div className="bg-white/15 rounded-full px-3 py-1">
                    Педагог <strong>{detail.teacher?.name || 'не назначен'}</strong>
                  </div>
                  <div className="bg-white/15 rounded-full px-3 py-1">
                    <strong>{(detail.monthlyFee || 75000).toLocaleString('ru-RU')} ₽</strong>/мес
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="text-white/80 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-3">
                Список детей
              </div>
              {!detail.children?.length ? (
                <div className="text-sm text-slate-400 py-6 text-center">
                  В группе нет детей
                </div>
              ) : (
                <ul className="space-y-2">
                  {detail.children
                    .filter(c => c.status === 'active')
                    .map(child => (
                      <li key={child.id}>
                        <Link
                          href={`/admin/children/${child.id}`}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-brand transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-brand-pale flex items-center justify-center font-serif text-sm text-brand">
                              {child.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{child.name}</div>
                              <div className="text-xs text-slate-500">
                                {calcAge(child.birthDate)} лет
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap justify-end">
                            {child.extraServices?.map(s => (
                              <Badge key={s} tone="warn">{s}</Badge>
                            ))}
                          </div>
                        </Link>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
