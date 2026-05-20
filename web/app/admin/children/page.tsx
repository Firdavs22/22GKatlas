'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, X, FileText, UserMinus, Search } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, Badge } from '@/components/ui';
import ChildWizard from '@/components/ChildWizard';
import ChildCreatedModal from '@/components/ChildCreatedModal';
import api from '@/lib/api';
import { Group, User } from '@/lib/types';

interface InviteResult {
  parentId: string;
  name: string;
  email: string;
  inviteToken: string;
}

const EXTRA_SERVICES_OPTIONS = ['Логопед', 'Хореография', 'Музыка', 'Английский', 'Рисование', 'Плавание', 'Шахматы', 'Робототехника'];

type ParentLink = { id: string; name: string; email: string; phone: string };
type Contact = { name: string; phone: string; relation: string };

interface ChildRow {
  id: string;
  name: string;
  birthDate: string;
  status: string;
  groupId?: string;
  contacts?: Contact[];
  representatives?: Contact[];
  extraServices?: string[];
  allergies?: string;
  documents?: Record<string, unknown>;
  notes?: string;
  parents?: { parent: { id: string; name: string; email: string; phone?: string } }[];
}

interface ChildForm {
  name: string;
  birthDate: string;
  parentLinks: ParentLink[];
  contacts: Contact[];
  representatives: Contact[];
  extraServices: string[];
  allergies: string;
  documents: Record<string, unknown>;
  notes: string;
}

const emptyParentLink = (): ParentLink => ({ id: '', name: '', email: '', phone: '' });
const emptyForm = (): ChildForm => ({
  name: '', birthDate: '',
  parentLinks: [emptyParentLink()],
  contacts: [], representatives: [], extraServices: [],
  allergies: '', documents: {}, notes: '',
});

const calcAge = (birthDate: string) => {
  const today = new Date();
  const b = new Date(birthDate);
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
};

const inputCls =
  'w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';
const smallInputCls =
  'w-full h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

export default function AdminChildren() {
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [, setStaff] = useState<User[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ChildForm>(emptyForm());

  // Wizard (new child creation) and post-creation invite modal
  const [wizardOpen, setWizardOpen] = useState(false);
  const [createdChild, setCreatedChild] = useState<{ name: string; invites: InviteResult[] } | null>(null);

  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterAge, setFilterAge] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [hardDeleteWord, setHardDeleteWord] = useState('');

  const reloadChildren = (archived: boolean) =>
    api.get('/admin/children', { params: archived ? { archived: 1 } : {} }).then(r => setChildren(r.data));

  useEffect(() => {
    reloadChildren(showArchived);
    api.get('/admin/groups').then(r => setGroups(r.data));
    api.get('/admin/staff').then(r =>
      setStaff(r.data.filter((s: User) => ['psychologist', 'pediatrician', 'teacher'].includes(s.role))),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  const hardDelete = async () => {
    if (!hardDeleteTarget || hardDeleteWord !== 'УДАЛИТЬ') return;
    try {
      await api.delete(`/admin/children/${hardDeleteTarget.id}/hard`);
      setChildren(prev => prev.filter(c => c.id !== hardDeleteTarget.id));
      setHardDeleteTarget(null);
      setHardDeleteWord('');
    } catch (e: unknown) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Не удалось');
    }
  };

  const openForm = (child?: ChildRow) => {
    if (child) {
      setEditingId(child.id);
      setForm({
        name: child.name,
        birthDate: child.birthDate?.split('T')[0] || '',
        contacts: child.contacts || [],
        parentLinks: child.parents?.length
          ? child.parents.map(link => ({
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
      setForm(emptyForm());
    }
    setFormOpen(true);
  };

  const saveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) await api.put(`/admin/children/${editingId}`, form);
      else await api.post('/admin/children', form);
      setFormOpen(false);
      setEditingId(null);
      reloadChildren(showArchived);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert('Ошибка: ' + (msg || 'не удалось сохранить'));
    }
  };

  const enroll = async (childId: string, groupId: string) => {
    await api.post(`/admin/children/${childId}/enroll`, { groupId });
    reloadChildren(showArchived);
  };

  const archive = async (childId: string) => {
    if (!confirm('Отчислить ребёнка?')) return;
    await api.delete(`/admin/children/${childId}`);
    setChildren(prev => prev.map(c => (c.id === childId ? { ...c, status: 'left' } : c)));
  };

  const toggleService = (s: string) => {
    setForm(p => ({
      ...p,
      extraServices: p.extraServices.includes(s)
        ? p.extraServices.filter(x => x !== s)
        : [...p.extraServices, s],
    }));
  };

  const addContact = () => setForm(p => ({ ...p, contacts: [...p.contacts, { name: '', phone: '', relation: '' }] }));
  const removeContact = (i: number) => setForm(p => ({ ...p, contacts: p.contacts.filter((_, idx) => idx !== i) }));
  const updateContact = (i: number, field: keyof Contact, val: string) =>
    setForm(p => ({ ...p, contacts: p.contacts.map((c, idx) => (idx === i ? { ...c, [field]: val } : c)) }));

  const addParentLink = () => setForm(p => ({ ...p, parentLinks: [...p.parentLinks, emptyParentLink()] }));
  const removeParentLink = (i: number) =>
    setForm(p => ({
      ...p,
      parentLinks: p.parentLinks.length > 1 ? p.parentLinks.filter((_, idx) => idx !== i) : p.parentLinks,
    }));
  const updateParentLink = (i: number, field: keyof ParentLink, val: string) =>
    setForm(p => ({ ...p, parentLinks: p.parentLinks.map((x, idx) => (idx === i ? { ...x, [field]: val } : x)) }));

  const addRep = () => setForm(p => ({ ...p, representatives: [...p.representatives, { name: '', phone: '', relation: '' }] }));
  const removeRep = (i: number) =>
    setForm(p => ({ ...p, representatives: p.representatives.filter((_, idx) => idx !== i) }));
  const updateRep = (i: number, field: keyof Contact, val: string) =>
    setForm(p => ({ ...p, representatives: p.representatives.map((c, idx) => (idx === i ? { ...c, [field]: val } : c)) }));

  const formatParents = (c: ChildRow) => {
    const names = (c.parents || [])
      .map(link => link.parent?.name || link.parent?.email)
      .filter(Boolean);
    return names.join(', ');
  };

  const filtered = children.filter(c => {
    if (c.status === 'left') return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterGroup !== 'all') {
      if (filterGroup === 'none' && c.groupId) return false;
      if (filterGroup !== 'none' && c.groupId !== filterGroup) return false;
    }
    if (filterAge !== 'all') {
      const age = calcAge(c.birthDate);
      const [min, max] = filterAge.split('-').map(Number);
      if (age < min || age > max) return false;
    }
    return true;
  });

  return (
    <PageLayout
      eyebrow={`Найдено: ${filtered.length}`}
      title="Дети"
      wide
      actions={
        <Button variant="primary" size="sm" onClick={() => setWizardOpen(true)}>
          <Plus size={16} />
          Зачислить ребёнка
        </Button>
      }
    >
      <Card padding="md" className="mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
              Поиск
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Имя ребёнка…"
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
              Группа
            </label>
            <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className={inputCls}>
              <option value="all">Все</option>
              <option value="none">Без группы</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
              Возраст
            </label>
            <select value={filterAge} onChange={e => setFilterAge(e.target.value)} className={inputCls}>
              <option value="all">Все</option>
              <option value="1-2">1–2</option>
              <option value="2-3">2–3</option>
              <option value="3-4">3–4</option>
              <option value="4-5">4–5</option>
              <option value="5-6">5–6</option>
              <option value="6-7">6–7</option>
            </select>
          </div>
          <div className="md:col-span-3 flex items-center gap-2 pt-1">
            <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={e => setShowArchived(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand"
              />
              Показать архивных (отчисленных)
            </label>
          </div>
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/40">
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-4 py-3">ФИО</th>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-3 py-3">Возраст</th>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-3 py-3">Группа</th>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-3 py-3">Родители</th>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-3 py-3">Доп. услуги</th>
                <th className="text-right text-[11px] font-medium uppercase tracking-wider text-slate-500 px-3 py-3">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                    Нет детей
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/40">
                    <td className="px-4 py-3">
                      <Link href={`/admin/children/${c.id}`} className="font-medium text-sm text-brand hover:underline">
                        {c.name}
                      </Link>
                      <div className="text-xs text-slate-400">
                        {new Date(c.birthDate).toLocaleDateString('ru-RU')}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{calcAge(c.birthDate)} лет</td>
                    <td className="px-3 py-3">
                      <select
                        value={c.groupId || ''}
                        onChange={e => e.target.value && enroll(c.id, e.target.value)}
                        className="h-8 px-2 text-xs rounded-lg border border-slate-200 bg-white focus:border-brand focus:outline-none max-w-[140px]"
                      >
                        <option value="">—</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600 max-w-[180px] truncate">
                      {formatParents(c) || <span className="text-warn">Нужно добавить</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.extraServices?.length ? c.extraServices.map(s => (
                          <Badge key={s} tone="warn">{s}</Badge>
                        )) : <span className="text-slate-300 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/children/${c.id}`}
                        className="inline-block p-1.5 text-slate-400 hover:text-brand transition-colors"
                        title="Карточка"
                      >
                        <FileText size={15} />
                      </Link>
                      <button
                        onClick={() => openForm(c)}
                        className="p-1.5 text-slate-400 hover:text-brand transition-colors"
                        title="Редактировать"
                      >
                        <Pencil size={15} />
                      </button>
                      {c.status === 'active' ? (
                        <button
                          onClick={() => archive(c.id)}
                          className="p-1.5 text-slate-400 hover:text-danger transition-colors"
                          title="Отчислить (архивировать — можно вернуть через БД)"
                        >
                          <UserMinus size={15} />
                        </button>
                      ) : (
                        <button
                          onClick={() => { setHardDeleteTarget({ id: c.id, name: c.name }); setHardDeleteWord(''); }}
                          className="p-1.5 text-red-500 hover:text-red-700 transition-colors"
                          title="Удалить безвозвратно"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {formOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setFormOpen(false)}
        >
          <div
            className="bg-background rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <form onSubmit={saveForm}>
              <div className="p-6 border-b border-slate-100 flex items-start justify-between">
                <h3 className="font-serif text-2xl">
                  {editingId ? 'Редактировать ребёнка' : 'Новый ребёнок'}
                </h3>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="p-1 text-slate-400 hover:text-foreground"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                      ФИО *
                    </label>
                    <input
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      required
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                      Дата рождения *
                    </label>
                    <input
                      type="date"
                      value={form.birthDate}
                      onChange={e => setForm(p => ({ ...p, birthDate: e.target.value }))}
                      required
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      Родители *
                    </label>
                    <button
                      type="button"
                      onClick={addParentLink}
                      className="text-xs text-brand hover:underline"
                    >
                      + Добавить родителя
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.parentLinks.map((parent, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 bg-brand-pale/30 border border-slate-100 rounded-xl p-3"
                      >
                        <input
                          value={parent.name}
                          onChange={e => updateParentLink(i, 'name', e.target.value)}
                          placeholder="ФИО родителя"
                          required
                          className={smallInputCls}
                        />
                        <input
                          value={parent.email}
                          onChange={e => updateParentLink(i, 'email', e.target.value)}
                          placeholder="Email для входа"
                          type="email"
                          required
                          disabled={!!parent.id}
                          className={`${smallInputCls} disabled:bg-slate-50 disabled:text-slate-500`}
                        />
                        <input
                          value={parent.phone}
                          onChange={e => updateParentLink(i, 'phone', e.target.value)}
                          placeholder="Телефон"
                          className={smallInputCls}
                        />
                        <button
                          type="button"
                          onClick={() => removeParentLink(i)}
                          className="text-slate-400 hover:text-danger transition-colors px-2"
                          title="Убрать"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    Родитель создаётся как пользователь с ролью «Родитель» и привязывается к ребёнку.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-2">
                    Доп. услуги
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EXTRA_SERVICES_OPTIONS.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleService(s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          form.extraServices.includes(s)
                            ? 'bg-brand text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                    Аллергии / здоровье
                  </label>
                  <textarea
                    value={form.allergies}
                    onChange={e => setForm(p => ({ ...p, allergies: e.target.value }))}
                    rows={2}
                    placeholder="Аллергия на орехи, лактозу…"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                  />
                </div>

                {(['contacts', 'representatives'] as const).map(field => {
                  const list = form[field];
                  const isReps = field === 'representatives';
                  const adder = isReps ? addRep : addContact;
                  const remover = isReps ? removeRep : removeContact;
                  const updater = isReps ? updateRep : updateContact;
                  const label = isReps ? 'Представители (кто может забирать)' : 'Контакты';
                  return (
                    <div key={field}>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                          {label}
                        </label>
                        <button
                          type="button"
                          onClick={adder}
                          className="text-xs text-brand hover:underline"
                        >
                          + Добавить
                        </button>
                      </div>
                      {list.map((c, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <input
                            value={c.name}
                            onChange={e => updater(i, 'name', e.target.value)}
                            placeholder="Имя"
                            className={smallInputCls}
                          />
                          <input
                            value={c.phone}
                            onChange={e => updater(i, 'phone', e.target.value)}
                            placeholder="Телефон"
                            className={smallInputCls}
                          />
                          <input
                            value={c.relation}
                            onChange={e => updater(i, 'relation', e.target.value)}
                            placeholder="Кем приходится"
                            className={smallInputCls}
                          />
                          <button
                            type="button"
                            onClick={() => remover(i)}
                            className="text-slate-400 hover:text-danger transition-colors px-1"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}

                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                    Заметки
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    rows={2}
                    placeholder="Документы, особые пожелания, комментарии…"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 flex gap-3">
                <Button type="submit" variant="primary">
                  {editingId ? 'Сохранить' : 'Добавить'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                  Отмена
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {wizardOpen && (
        <ChildWizard
          groups={groups}
          onClose={() => setWizardOpen(false)}
          onCreated={(child, invites) => {
            setWizardOpen(false);
            setCreatedChild({ name: child.name, invites });
            reloadChildren(showArchived);
          }}
        />
      )}

      {createdChild && (
        <ChildCreatedModal
          childName={createdChild.name}
          invites={createdChild.invites}
          onClose={() => setCreatedChild(null)}
        />
      )}

      {hardDeleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => { setHardDeleteTarget(null); setHardDeleteWord(''); }}
        >
          <div
            className="bg-white rounded-3xl shadow-lg max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mb-3">
              <X size={20} />
            </div>
            <h3 className="font-serif text-2xl mb-2">Удалить безвозвратно</h3>
            <p className="text-sm text-slate-600 mb-3">
              Ребёнок <span className="font-medium text-foreground">{hardDeleteTarget.name}</span> и все связанные данные
              (прогресс, наблюдения, портфолио, посещаемость, чаты, платежи) будут стёрты без возможности восстановления.
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Используйте только если родитель воспользовался правом на удаление данных.
              Для обычного отчисления — кнопка «Отчислить» (можно вернуть через БД).
            </p>
            <label className="block text-xs text-slate-600 mb-1.5">
              Введите <span className="font-mono font-semibold text-red-700">УДАЛИТЬ</span> для подтверждения:
            </label>
            <input
              value={hardDeleteWord}
              onChange={e => setHardDeleteWord(e.target.value)}
              autoFocus
              className={`${inputCls} mb-4`}
            />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => { setHardDeleteTarget(null); setHardDeleteWord(''); }}>
                Отмена
              </Button>
              <button
                type="button"
                disabled={hardDeleteWord !== 'УДАЛИТЬ'}
                onClick={hardDelete}
                className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <X size={14} /> Удалить безвозвратно
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
