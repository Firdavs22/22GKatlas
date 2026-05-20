'use client';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Search, Ban, Power, KeyRound, Trash2, Mail, Copy, Check } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, Badge } from '@/components/ui';
import api from '@/lib/api';
import { User } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Суперадминистратор',
  admin: 'Администратор',
  teacher: 'Педагог',
  psychologist: 'Психолог',
  pediatrician: 'Педиатр',
};

const DELETE_CONFIRM_WORD = 'УДАЛИТЬ';

const ROLE_ORDER: { id: string; label: string }[] = [
  { id: 'teacher', label: 'Педагоги' },
  { id: 'psychologist', label: 'Психологи' },
  { id: 'pediatrician', label: 'Педиатры' },
  { id: 'admin', label: 'Администраторы' },
];

const inputCls =
  'w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

export default function AdminStaff() {
  const { user: me } = useAuth();
  const [staff, setStaff] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', name: '', role: 'teacher' });
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteWord, setDeleteWord] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState<{ email: string; name: string; inviteUrl: string; isResend: boolean } | null>(null);

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
      setInviteSent({ email: form.email, name: form.name, inviteUrl: data.inviteUrl, isResend: false });
      api.get('/admin/staff').then(r => setStaff(r.data));
    }
    setFormOpen(false);
    setEditingId(null);
    setForm({ email: '', name: '', role: 'teacher' });
  };

  const toggleBlock = async (s: User) => {
    setActionLoading(s.id);
    try {
      const action = s.blockedAt ? 'unblock' : 'block';
      await api.patch(`/admin/staff/${s.id}/${action}`);
      setStaff(prev =>
        prev.map(u => (u.id === s.id ? { ...u, blockedAt: s.blockedAt ? null : new Date().toISOString() } : u)),
      );
    } catch (e: unknown) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Не удалось');
    } finally {
      setActionLoading(null);
    }
  };

  const resendInvite = async (s: User) => {
    if (!confirm(`Перевыпустить приглашение для ${s.name}?\nСтарый пароль перестанет работать. Сотрудник получит новую ссылку на ${s.email} и заново примет условия.`)) {
      return;
    }
    setActionLoading(s.id);
    try {
      const { data } = await api.post(`/admin/staff/${s.id}/resend-invite`);
      setInviteSent({ email: s.email, name: s.name, inviteUrl: data.inviteUrl, isResend: true });
    } catch (e: unknown) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Не удалось');
    } finally {
      setActionLoading(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteWord !== DELETE_CONFIRM_WORD) return;
    setActionLoading(deleteTarget.id);
    try {
      await api.delete(`/admin/staff/${deleteTarget.id}`);
      setStaff(prev => prev.filter(u => u.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteWord('');
    } catch (e: unknown) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Не удалось');
    } finally {
      setActionLoading(null);
    }
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
          filtered.map(s => {
            const isSelf = me?.id === s.id;
            const isSuper = s.role === 'superadmin';
            const isBlocked = !!s.blockedAt;
            const busy = actionLoading === s.id;
            return (
              <Card key={s.id} padding="md" className={isBlocked ? 'opacity-60' : ''}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-brand-pale flex items-center justify-center font-serif text-brand shrink-0">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm flex items-center gap-2">
                        {s.name}
                        {isBlocked && (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-danger">
                            <Ban size={11} /> Заблокирован
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 truncate">{s.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone="brand">{ROLE_LABEL[s.role] || s.role}</Badge>
                    <button
                      onClick={() => openForm(s)}
                      disabled={busy || isSuper}
                      title={isSuper ? 'Суперадминистратор не редактируется через UI' : 'Изменить имя и роль'}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 px-3 h-8 rounded-full hover:border-brand hover:text-brand transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Pencil size={13} /> Изменить
                    </button>
                    <button
                      onClick={() => resendInvite(s)}
                      disabled={busy || isSelf || isSuper}
                      title={isSelf ? 'Себе не нужно' : isSuper ? 'Не для суперадмина' : 'Сбросить пароль и выслать новое приглашение'}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 px-3 h-8 rounded-full hover:border-brand hover:text-brand transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <KeyRound size={13} /> Сбросить
                    </button>
                    <button
                      onClick={() => toggleBlock(s)}
                      disabled={busy || isSelf || isSuper}
                      title={
                        isSelf ? 'Нельзя заблокировать себя'
                          : isSuper ? 'Нельзя заблокировать суперадмина'
                          : isBlocked ? 'Разблокировать вход' : 'Заблокировать вход'
                      }
                      className={`inline-flex items-center gap-1.5 text-xs px-3 h-8 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                        isBlocked
                          ? 'text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                          : 'text-amber-700 border border-amber-200 hover:bg-amber-50'
                      }`}
                    >
                      {isBlocked ? (<><Power size={13} /> Разблок.</>) : (<><Ban size={13} /> Блок.</>)}
                    </button>
                    <button
                      onClick={() => { setDeleteTarget(s); setDeleteWord(''); }}
                      disabled={busy || isSelf || isSuper}
                      title={
                        isSelf ? 'Нельзя удалить себя'
                          : isSuper ? 'Нельзя удалить суперадмина'
                          : 'Удалить аккаунт (анонимизация ПДн, необратимо)'
                      }
                      className="inline-flex items-center gap-1.5 text-xs text-red-700 border border-red-200 px-3 h-8 rounded-full hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={13} /> Удалить
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {inviteSent && (
        <InviteSentModal data={inviteSent} onClose={() => setInviteSent(null)} />
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => { setDeleteTarget(null); setDeleteWord(''); }}
        >
          <div
            className="bg-white rounded-3xl shadow-lg max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mb-3">
              <Trash2 size={20} />
            </div>
            <h3 className="font-serif text-2xl mb-2">Удалить сотрудника</h3>
            <p className="text-sm text-slate-600 mb-4">
              Аккаунт <span className="font-medium text-foreground">{deleteTarget.name}</span> ({deleteTarget.email}) будет анонимизирован:
              email, имя, телефон и пароль будут стёрты. Это необратимо.
            </p>
            <p className="text-xs text-slate-500 mb-3">
              Связанные записи (наблюдения, портфолио, чаты) сохраняются для целостности — через 30 дней физически удаляются по расписанию.
            </p>
            <label className="block text-xs text-slate-600 mb-1.5">
              Введите <span className="font-mono font-semibold text-red-700">{DELETE_CONFIRM_WORD}</span> для подтверждения:
            </label>
            <input
              value={deleteWord}
              onChange={e => setDeleteWord(e.target.value)}
              autoFocus
              className={`${inputCls} mb-4`}
            />
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setDeleteTarget(null); setDeleteWord(''); }}
              >
                Отмена
              </Button>
              <button
                type="button"
                disabled={deleteWord !== DELETE_CONFIRM_WORD || actionLoading === deleteTarget.id}
                onClick={confirmDelete}
                className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 size={14} /> Удалить безвозвратно
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

function InviteSentModal({
  data,
  onClose,
}: {
  data: { email: string; name: string; inviteUrl: string; isResend: boolean };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(data.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback — выделить текст для ручного копирования
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-lg max-w-md w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-brand-pale text-brand flex items-center justify-center mb-3">
          <Mail size={20} />
        </div>
        <h3 className="font-serif text-2xl mb-2">
          {data.isResend ? 'Пароль сброшен' : 'Приглашение отправлено'}
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          Письмо со ссылкой отправлено на <span className="font-medium text-foreground">{data.email}</span>.
          {data.isResend
            ? ' Старый пароль перестал работать.'
            : ` ${data.name} получит инструкции по созданию пароля.`}
        </p>
        <p className="text-xs text-slate-500 mb-2">
          Если письмо не пришло (попало в спам, неверный адрес) — скопируйте ссылку и передайте лично:
        </p>
        <div className="mb-4">
          <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-700 break-all max-h-24 overflow-y-auto">
            {data.inviteUrl}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={copyUrl}
            className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-medium transition-colors ${
              copied
                ? 'bg-emerald-100 text-emerald-700'
                : 'border border-slate-200 text-slate-700 hover:border-brand hover:text-brand'
            }`}
          >
            {copied ? <><Check size={14} /> Скопировано</> : <><Copy size={14} /> Скопировать ссылку</>}
          </button>
          <Button type="button" variant="primary" onClick={onClose}>
            Понятно
          </Button>
        </div>
      </div>
    </div>
  );
}
