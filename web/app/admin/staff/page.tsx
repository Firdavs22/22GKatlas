'use client';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Search } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, Badge } from '@/components/ui';
import api from '@/lib/api';
import { User } from '@/lib/types';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Администратор',
  teacher: 'Педагог',
  psychologist: 'Психолог',
  pediatrician: 'Педиатр',
};

const ROLE_ORDER: { id: string; label: string }[] = [
  { id: 'teacher', label: 'Педагоги' },
  { id: 'psychologist', label: 'Психологи' },
  { id: 'pediatrician', label: 'Педиатры' },
  { id: 'admin', label: 'Администраторы' },
];

const inputCls =
  'w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

export default function AdminStaff() {
  const [staff, setStaff] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', name: '', role: 'teacher' });

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of staff) counts[s.role] = (counts[s.role] || 0) + 1;
    return counts;
  }, [staff]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter(s => {
      if (roleFilter.size > 0 && !roleFilter.has(s.role)) return false;
      if (q && ![s.name, s.email].some(v => v?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [staff, search, roleFilter]);

  const toggleRole = (id: string) => {
    setRoleFilter(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    api.get('/admin/staff').then(r => setStaff(r.data));
  }, []);

  const openForm = (user?: User) => {
    if (user) {
      setEditingId(user.id);
      setForm({ email: user.email, name: user.name, role: user.role });
    } else {
      setEditingId(null);
      setForm({ email: '', name: '', role: 'teacher' });
    }
    setFormOpen(true);
  };

  const saveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const { data } = await api.put(`/admin/staff/${editingId}`, {
        name: form.name,
        role: form.role,
      });
      setStaff(prev => prev.map(s => (s.id === editingId ? { ...s, ...data } : s)));
    } else {
      const { data } = await api.post('/admin/staff/invite', form);
      alert(`Токен приглашения: ${data.inviteToken}`);
      api.get('/admin/staff').then(r => setStaff(r.data));
    }
    setFormOpen(false);
    setEditingId(null);
    setForm({ email: '', name: '', role: 'teacher' });
  };

  return (
    <PageLayout
      eyebrow={
        roleFilter.size > 0 || search
          ? `Найдено: ${filtered.length} из ${staff.length}`
          : `${staff.length} ${staff.length === 1 ? 'сотрудник' : staff.length < 5 ? 'сотрудника' : 'сотрудников'}`
      }
      title="Команда"
      actions={
        <Button variant="primary" size="sm" onClick={() => openForm()}>
          <Plus size={16} />
          Пригласить
        </Button>
      }
    >
      <Card padding="md" className="mb-4">
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ФИО, email…"
            className={`${inputCls} pl-9`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mr-1">
            Отдел
          </span>
          <button
            type="button"
            onClick={() => setRoleFilter(new Set())}
            className={`px-3 h-7 text-xs rounded-full transition-colors ${
              roleFilter.size === 0
                ? 'bg-brand text-white'
                : 'border border-slate-200 text-slate-600 hover:border-brand'
            }`}
          >
            Все
          </button>
          {ROLE_ORDER.map(r => {
            const active = roleFilter.has(r.id);
            const count = roleCounts[r.id] || 0;
            if (count === 0) return null;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => toggleRole(r.id)}
                className={`px-3 h-7 text-xs rounded-full transition-colors ${
                  active
                    ? 'bg-brand text-white'
                    : 'border border-slate-200 text-slate-600 hover:border-brand'
                }`}
              >
                {r.label} <span className={`ml-1 ${active ? 'text-white/80' : 'text-slate-400'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {formOpen && (
        <Card padding="md" className="mb-6">
          <h3 className="font-serif text-xl mb-4">
            {editingId ? 'Редактировать сотрудника' : 'Пригласить сотрудника'}
          </h3>
          <form onSubmit={saveForm} className="space-y-3">
            <input
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="Email"
              type="email"
              required
              disabled={!!editingId}
              className={`${inputCls} disabled:bg-slate-50 disabled:text-slate-500`}
            />
            <input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="ФИО"
              required
              className={inputCls}
            />
            <select
              value={form.role}
              onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              className={inputCls}
            >
              <option value="teacher">Педагог</option>
              <option value="psychologist">Психолог</option>
              <option value="pediatrician">Педиатр</option>
              <option value="admin">Администратор</option>
            </select>
            <div className="flex gap-2">
              <Button type="submit" variant="primary">
                {editingId ? 'Сохранить' : 'Пригласить'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Отмена
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card padding="md">
            <div className="text-sm text-slate-400 py-12 text-center">
              {staff.length === 0 ? 'Сотрудников нет' : 'Никого не найдено'}
            </div>
          </Card>
        ) : (
          filtered.map(s => (
            <Card key={s.id} padding="md">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-brand-pale flex items-center justify-center font-serif text-brand shrink-0">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{s.name}</div>
                    <div className="text-sm text-slate-500 truncate">{s.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge tone="brand">{ROLE_LABEL[s.role] || s.role}</Badge>
                  <button
                    onClick={() => openForm(s)}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 px-3 h-8 rounded-full hover:border-brand hover:text-brand transition-colors"
                  >
                    <Pencil size={13} /> Изменить
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </PageLayout>
  );
}
