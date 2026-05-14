'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Pencil, Send } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, Badge, SectionLabel } from '@/components/ui';
import InviteShareModal from '@/components/InviteShareModal';
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
const inputCls =
  'w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

export default function AdminParents() {
  const [parents, setParents] = useState<ParentUser[]>([]);
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [invite, setInvite] = useState<{ token: string; name: string } | null>(null);

  const load = () => {
    Promise.all([api.get('/admin/parents'), api.get('/admin/children')]).then(([p, c]) => {
      setParents(p.data || []);
      setChildren(c.data || []);
    });
  };

  useEffect(() => { load(); }, []);

  const orphans = useMemo(() => children.filter(c => !c.parents?.length), [children]);

  const filtered = parents.filter(p => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [p.name, p.email, p.phone].filter(Boolean).some(v => String(v).toLowerCase().includes(q));
  });

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
      eyebrow={`${parents.length} родителей · ${orphans.length} детей без родителя`}
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

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card padding="md">
            <div className="text-sm text-slate-400 py-12 text-center">Родители не найдены</div>
          </Card>
        ) : (
          filtered.map(parent => (
            <Card key={parent.id} padding="md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm">{parent.name}</div>
                  <div className="text-sm text-slate-500">{parent.email}</div>
                  {parent.phone && <div className="text-sm text-slate-500">{parent.phone}</div>}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={async () => {
                      const { data } = await api.post(`/admin/parents/${parent.id}/invite-link`);
                      setInvite({ token: data.inviteToken, name: parent.name });
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 px-3 h-8 rounded-full hover:border-brand hover:text-brand transition-colors"
                    title="Сгенерировать новую ссылку приглашения"
                  >
                    <Send size={13} /> Ссылка
                  </button>
                  <button
                    onClick={() => openForm(parent)}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 px-3 h-8 rounded-full hover:border-brand hover:text-brand transition-colors"
                  >
                    <Pencil size={13} /> Изменить
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
          ))
        )}
      </div>

      {invite && (
        <InviteShareModal
          token={invite.token}
          parentName={invite.name}
          onClose={() => setInvite(null)}
        />
      )}
    </PageLayout>
  );
}
