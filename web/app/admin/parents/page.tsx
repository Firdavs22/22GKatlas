'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Pencil, Send, Ban, Power, Trash2 } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, Badge, SectionLabel } from '@/components/ui';
import InviteShareModal from '@/components/InviteShareModal';
import api from '@/lib/api';

type ParentUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  blockedAt?: string | null;
  parentChildren?: { child: { id: string; name: string; status: string; group?: { id?: string; name?: string } } }[];
};

type ChildRow = {
  id: string;
  name: string;
  groupId?: string;
  group?: { id?: string; name?: string };
  parents?: { parent: { id: string; name: string; email: string } }[];
};

type GroupRow = { id: string; name: string };

const emptyForm = { email: '', name: '', phone: '', childIds: [] as string[] };
const inputCls =
  'w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

export default function AdminParents() {
  const [parents, setParents] = useState<ParentUser[]>([]);
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [groupFilter, setGroupFilter] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [invite, setInvite] = useState<{ token: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ parent: ParentUser; mode: 'soft' | 'hard' } | null>(null);
  const [deleteWord, setDeleteWord] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const toggleBlock = async (p: ParentUser) => {
    setBusy(p.id);
    try {
      const action = p.blockedAt ? 'unblock' : 'block';
      await api.patch(`/admin/parents/${p.id}/${action}`);
      setParents(prev => prev.map(x => x.id === p.id ? { ...x, blockedAt: p.blockedAt ? null : new Date().toISOString() } : x));
    } catch (e: unknown) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Не удалось');
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleteWord !== 'УДАЛИТЬ') return;
    setBusy(deleteTarget.parent.id);
    try {
      const url = deleteTarget.mode === 'hard'
        ? `/admin/parents/${deleteTarget.parent.id}/hard`
        : `/admin/parents/${deleteTarget.parent.id}`;
      await api.delete(url);
      setParents(prev => prev.filter(x => x.id !== deleteTarget.parent.id));
      setDeleteTarget(null);
      setDeleteWord('');
    } catch (e: unknown) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Не удалось');
    } finally {
      setBusy(null);
    }
  };

  const load = () => {
    Promise.all([
      api.get('/admin/parents'),
      api.get('/admin/children'),
      api.get('/admin/groups'),
    ]).then(([p, c, g]) => {
      setParents(p.data || []);
      setChildren(c.data || []);
      setGroups(g.data || []);
    });
  };

  useEffect(() => { load(); }, []);

  const orphans = useMemo(() => children.filter(c => !c.parents?.length), [children]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return parents.filter(p => {
      if (q) {
        const matches = [p.name, p.email, p.phone]
          .filter(Boolean)
          .some(v => String(v).toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (groupFilter.size > 0) {
        const parentGroupIds = (p.parentChildren || [])
          .map(link => link.child.group?.id)
          .filter((id): id is string => Boolean(id));
        if (!parentGroupIds.some(id => groupFilter.has(id))) return false;
      }
      return true;
    });
  }, [parents, search, groupFilter]);

  const toggleGroup = (id: string) => {
    setGroupFilter(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openForm = (p?: ParentUser) => {
    if (p) {
      setEditingId(p.id);
      setForm({
        email: p.email,
        name: p.name,
        phone: p.phone || '',
        childIds: p.parentChildren?.map(l => l.child.id) || [],
      });
    } else {
      setEditingId(null);
      setForm(emptyForm);
    }
    setFormOpen(true);
  };

  const toggleChild = (id: string) => {
    setForm(p => ({
      ...p,
      childIds: p.childIds.includes(id) ? p.childIds.filter(x => x !== id) : [...p.childIds, id],
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
      setInvite({ token: data.inviteToken, name: form.name });
    }
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    load();
  };

  return (
    <PageLayout
      eyebrow={
        groupFilter.size > 0
          ? `${filtered.length} из ${parents.length} родителей · ${orphans.length} детей без родителя`
          : `${parents.length} родителей · ${orphans.length} детей без родителя`
      }
      title="Родители"
      wide
      actions={
        <Button variant="primary" size="sm" onClick={() => openForm()}>
          <Plus size={16} />
          Пригласить
        </Button>
      }
    >
      <Card padding="md" className="mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ФИО, email, телефон…"
            className={`${inputCls} pl-9`}
          />
        </div>
        {groups.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mr-1">
              Группы
            </span>
            <button
              type="button"
              onClick={() => setGroupFilter(new Set())}
              className={`px-3 h-7 text-xs rounded-full transition-colors ${
                groupFilter.size === 0
                  ? 'bg-brand text-white'
                  : 'border border-slate-200 text-slate-600 hover:border-brand'
              }`}
            >
              Все
            </button>
            {groups.map(g => {
              const active = groupFilter.has(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGroup(g.id)}
                  className={`px-3 h-7 text-xs rounded-full transition-colors ${
                    active
                      ? 'bg-brand text-white'
                      : 'border border-slate-200 text-slate-600 hover:border-brand'
                  }`}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {orphans.length > 0 && (
        <Card padding="md" className="mb-4 border-warn/40 bg-warn/10">
          <SectionLabel>Нужно привязать родителя</SectionLabel>
          <div className="flex flex-wrap gap-2 mt-3">
            {orphans.map(child => (
              <Link key={child.id} href={`/admin/children/${child.id}`}>
                <Badge tone="warn">{child.name}</Badge>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {formOpen && (
        <Card padding="md" className="mb-6">
          <h3 className="font-serif text-xl mb-4">
            {editingId ? 'Редактировать родителя' : 'Пригласить родителя'}
          </h3>
          <form onSubmit={saveForm} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="ФИО"
                required
                className={inputCls}
              />
              <input
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="Email"
                type="email"
                required
                className={inputCls}
              />
              <input
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="Телефон"
                className={inputCls}
              />
            </div>
            {!editingId && (
              <div>
                <SectionLabel>Привязать детей</SectionLabel>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto border border-slate-200 rounded-xl p-2 mt-2">
                  {children.map(child => (
                    <label
                      key={child.id}
                      className="flex items-start gap-2 text-sm rounded-lg p-2 cursor-pointer hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={form.childIds.includes(child.id)}
                        onChange={() => toggleChild(child.id)}
                        className="mt-1 w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand"
                      />
                      <span>
                        <span className="font-medium block">{child.name}</span>
                        <span className="text-xs text-slate-500">{child.group?.name || 'Без группы'}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
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
            <div className="text-sm text-slate-400 py-12 text-center">Родители не найдены</div>
          </Card>
        ) : (
          filtered.map(parent => {
            const isBlocked = !!parent.blockedAt;
            const isBusy = busy === parent.id;
            return (
            <Card key={parent.id} padding="md" className={isBlocked ? 'opacity-60' : ''}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {parent.name}
                    {isBlocked && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-danger">
                        <Ban size={11} /> Заблокирован
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-500">{parent.email}</div>
                  {parent.phone && <div className="text-sm text-slate-500">{parent.phone}</div>}
                </div>
                <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                  <button
                    onClick={async () => {
                      const { data } = await api.post(`/admin/parents/${parent.id}/invite-link`);
                      setInvite({ token: data.inviteToken, name: parent.name });
                    }}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 px-3 h-8 rounded-full hover:border-brand hover:text-brand transition-colors disabled:opacity-40"
                    title="Сгенерировать новую ссылку приглашения (сброс пароля)"
                  >
                    <Send size={13} /> Ссылка
                  </button>
                  <button
                    onClick={() => openForm(parent)}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 px-3 h-8 rounded-full hover:border-brand hover:text-brand transition-colors disabled:opacity-40"
                  >
                    <Pencil size={13} /> Изменить
                  </button>
                  <button
                    onClick={() => toggleBlock(parent)}
                    disabled={isBusy}
                    title={isBlocked ? 'Разблокировать вход' : 'Заблокировать вход'}
                    className={`inline-flex items-center gap-1.5 text-xs px-3 h-8 rounded-full transition-colors disabled:opacity-40 ${
                      isBlocked
                        ? 'text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                        : 'text-amber-700 border border-amber-200 hover:bg-amber-50'
                    }`}
                  >
                    {isBlocked ? (<><Power size={13} /> Разблок.</>) : (<><Ban size={13} /> Блок.</>)}
                  </button>
                  <button
                    onClick={() => { setDeleteTarget({ parent, mode: 'soft' }); setDeleteWord(''); }}
                    disabled={isBusy}
                    title="Удалить (анонимизировать ПДн, связи с детьми сохранятся)"
                    className="inline-flex items-center gap-1.5 text-xs text-red-700 border border-red-200 px-3 h-8 rounded-full hover:bg-red-50 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={13} /> Удалить
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {parent.parentChildren?.length ? (
                  parent.parentChildren.map(link => (
                    <Link key={link.child.id} href={`/admin/children/${link.child.id}`}>
                      <Badge tone="brand">
                        {link.child.name}
                        {link.child.group?.name ? ` · ${link.child.group.name}` : ''}
                      </Badge>
                    </Link>
                  ))
                ) : (
                  <Badge tone="warn">Не привязан к ребёнку</Badge>
                )}
              </div>
            </Card>
            );
          })
        )}
      </div>

      {invite && (
        <InviteShareModal
          token={invite.token}
          parentName={invite.name}
          onClose={() => setInvite(null)}
        />
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => { setDeleteTarget(null); setDeleteWord(''); }}
        >
          <div className="bg-white rounded-3xl shadow-lg max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mb-3">
              <Trash2 size={20} />
            </div>
            <h3 className="font-serif text-2xl mb-2">Удалить родителя</h3>
            <p className="text-sm text-slate-600 mb-3">
              Аккаунт <span className="font-medium text-foreground">{deleteTarget.parent.name}</span> ({deleteTarget.parent.email}) будет анонимизирован: email, имя, телефон и пароль будут стёрты. Это необратимо.
            </p>
            <div className="mb-4 text-xs">
              <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="radio"
                  checked={deleteTarget.mode === 'soft'}
                  onChange={() => setDeleteTarget({ ...deleteTarget, mode: 'soft' })}
                  className="w-3.5 h-3.5"
                />
                Анонимизировать (связи с детьми сохранятся для истории)
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 mt-1">
                <input
                  type="radio"
                  checked={deleteTarget.mode === 'hard'}
                  onChange={() => setDeleteTarget({ ...deleteTarget, mode: 'hard' })}
                  className="w-3.5 h-3.5"
                />
                Удалить полностью — стираются и связи с детьми
              </label>
            </div>
            <label className="block text-xs text-slate-600 mb-1.5">
              Введите <span className="font-mono font-semibold text-red-700">УДАЛИТЬ</span> для подтверждения:
            </label>
            <input
              value={deleteWord}
              onChange={e => setDeleteWord(e.target.value)}
              autoFocus
              className={`${inputCls} mb-4`}
            />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => { setDeleteTarget(null); setDeleteWord(''); }}>
                Отмена
              </Button>
              <button
                type="button"
                disabled={deleteWord !== 'УДАЛИТЬ'}
                onClick={confirmDelete}
                className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 size={14} /> Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
