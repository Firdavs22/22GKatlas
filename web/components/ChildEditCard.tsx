'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, AlertCircle, Loader2, Pencil, Camera, X, Plus } from 'lucide-react';
import { Card, Button, SectionLabel } from '@/components/ui';
import api from '@/lib/api';
import AuthMedia from '@/components/AuthMedia';
import FileUpload from '@/components/FileUpload';

const EXTRA_SERVICES = ['Логопед', 'Хореография', 'Музыка', 'Английский', 'Рисование', 'Плавание', 'Шахматы', 'Робототехника'];

const inputCls =
  'w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

interface ContactDraft {
  name: string;
  phone: string;
  relation: string;
}

interface ParentLinkDraft {
  id?: string;
  name: string;
  email: string;
  phone?: string;
}

interface ChildEditCardProps {
  child: {
    id: string;
    name?: string;
    birthDate?: string;
    photo?: string | null;
    allergies?: string;
    extraServices?: string[];
    notes?: string;
    contacts?: ContactDraft[];
    representatives?: ContactDraft[];
    groupId?: string;
    parents?: { parent: { id: string; name: string; email?: string; phone?: string } }[];
  };
  groups?: { id: string; name: string }[];
  /** Когда удалось сохранить — отдадим обновлённого ребёнка. */
  onUpdated?: (child: unknown) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function ChildEditCard({ child, groups, onUpdated }: ChildEditCardProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(child.name || '');
  const [birthDate, setBirthDate] = useState((child.birthDate || '').slice(0, 10));
  const [photo, setPhoto] = useState<string | null>(child.photo || null);
  const [allergies, setAllergies] = useState(child.allergies || '');
  const [extraServices, setExtraServices] = useState<string[]>(child.extraServices || []);
  const [notes, setNotes] = useState(child.notes || '');
  const [groupId, setGroupId] = useState(child.groupId || '');
  const [contacts, setContacts] = useState<ContactDraft[]>(
    Array.isArray(child.contacts) ? child.contacts : [],
  );
  const [representatives, setRepresentatives] = useState<ContactDraft[]>(
    Array.isArray(child.representatives) ? child.representatives : [],
  );
  const [parentLinks, setParentLinks] = useState<ParentLinkDraft[]>(
    (child.parents || []).map(link => ({
      id: link.parent.id,
      name: link.parent.name,
      email: link.parent.email || '',
      phone: link.parent.phone || '',
    })),
  );
  const [availableParents, setAvailableParents] = useState<{ id: string; name: string; email: string; phone?: string }[]>([]);
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
  const [parentQuery, setParentQuery] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRunRef = useRef(true);

  // Auto-save (debounced) once user is editing
  useEffect(() => {
    if (!editing) return;
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persist();
    }, 700);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, birthDate, photo, allergies, extraServices, notes, groupId, contacts, representatives, parentLinks]);

  // Load all parents once when editing starts (for the picker)
  useEffect(() => {
    if (!editing || availableParents.length > 0) return;
    api.get('/admin/parents').then(r => {
      const list = (r.data || []).map((p: { id: string; name: string; email: string; phone?: string }) => ({
        id: p.id, name: p.name, email: p.email, phone: p.phone || '',
      }));
      setAvailableParents(list);
    }).catch(() => {});
  }, [editing, availableParents.length]);

  const persist = async () => {
    if (!editing) return;
    if (!name.trim()) return;
    const validParents = parentLinks.filter(p => p.name.trim() && (p.id || p.email.trim()));
    if (validParents.length === 0) {
      setSaveStatus('error');
      return;
    }
    setSaveStatus('saving');
    try {
      const { data } = await api.put(`/admin/children/${child.id}`, {
        name: name.trim(),
        birthDate: birthDate || undefined,
        photo: photo || null,
        allergies: allergies || null,
        extraServices,
        notes: notes || null,
        groupId: groupId || null,
        contacts: contacts.filter(c => c.name || c.phone),
        representatives: representatives.filter(c => c.name || c.phone),
        parentLinks: validParents.map(p => ({
          id: p.id,
          name: p.name.trim(),
          email: p.email.trim(),
          phone: p.phone?.trim() || '',
        })),
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(s => (s === 'saved' ? 'idle' : s)), 1500);
      onUpdated?.(data);
    } catch {
      setSaveStatus('error');
    }
  };

  const addRow = (which: 'contacts' | 'representatives') => {
    const setter = which === 'contacts' ? setContacts : setRepresentatives;
    setter(prev => [...prev, { name: '', phone: '', relation: '' }]);
  };
  const updateRow = (which: 'contacts' | 'representatives', i: number, patch: Partial<ContactDraft>) => {
    const setter = which === 'contacts' ? setContacts : setRepresentatives;
    setter(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const removeRow = (which: 'contacts' | 'representatives', i: number) => {
    const setter = which === 'contacts' ? setContacts : setRepresentatives;
    setter(prev => prev.filter((_, idx) => idx !== i));
  };

  if (!editing) {
    return (
      <Card padding="md" className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {photo ? (
              <AuthMedia preview src={photo} alt={name} className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-brand-pale flex items-center justify-center font-serif text-brand text-xl">
                {name.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <div>
              <SectionLabel>Личное дело</SectionLabel>
              <div className="font-serif text-xl mt-0.5">{name || 'Без имени'}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {birthDate ? new Date(birthDate).toLocaleDateString('ru-RU') : 'дата не указана'}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil size={14} />
            Редактировать
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="md" className="mb-6">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <SectionLabel>Редактирование карточки</SectionLabel>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            {saveStatus === 'saving' ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Сохранение…
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <Check size={12} className="text-success" />
                Сохранено
              </>
            ) : saveStatus === 'error' ? (
              <>
                <AlertCircle size={12} className="text-danger" />
                Ошибка
              </>
            ) : (
              <>
                <Check size={12} />
                Автосохранение
              </>
            )}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Готово
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-5">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative w-28 h-28 rounded-full overflow-hidden bg-brand-pale flex items-center justify-center">
            {photo ? (
              <AuthMedia preview src={photo} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span className="font-serif text-3xl text-brand">{name.charAt(0).toUpperCase() || '?'}</span>
            )}
            {photo && (
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                aria-label="Убрать фото"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <FileUpload
            onUpload={urls => setPhoto(urls[0] || null)}
            label={
              <span className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline cursor-pointer">
                <Camera size={14} /> {photo ? 'Заменить' : 'Загрузить фото'}
              </span>
            }
          />
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Имя
              </label>
              <input value={name} onChange={e => setName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Дата рождения
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {groups && groups.length > 0 && (
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Группа
              </label>
              <select
                value={groupId}
                onChange={e => setGroupId(e.target.value)}
                className={inputCls}
              >
                <option value="">Без группы</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div className="flex items-baseline justify-between mb-1">
              <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Родители · доступ в систему
              </label>
              <button
                type="button"
                onClick={() => setParentPickerOpen(v => !v)}
                className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
              >
                <Plus size={12} /> Привязать
              </button>
            </div>
            <ParentLinkList
              rows={parentLinks}
              onUpdate={(i, patch) =>
                setParentLinks(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
              }
              onRemove={i => setParentLinks(prev => prev.filter((_, idx) => idx !== i))}
            />
            {parentPickerOpen && (
              <ParentPicker
                available={availableParents.filter(
                  p => !parentLinks.some(pl => pl.id === p.id),
                )}
                query={parentQuery}
                onQuery={setParentQuery}
                onPick={p => {
                  setParentLinks(prev => [...prev, p]);
                  setParentPickerOpen(false);
                  setParentQuery('');
                }}
                onCreate={(draft) => {
                  setParentLinks(prev => [...prev, draft]);
                  setParentPickerOpen(false);
                  setParentQuery('');
                }}
                onClose={() => { setParentPickerOpen(false); setParentQuery(''); }}
              />
            )}
            {parentLinks.length === 0 && (
              <div className="text-[11px] text-danger mt-1">
                У ребёнка должен быть хотя бы один родитель.
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
              Аллергии / питание
            </label>
            <textarea
              value={allergies}
              onChange={e => setAllergies(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
              placeholder="Например: орехи, яйцо"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-2">
              Доп. услуги
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EXTRA_SERVICES.map(s => {
                const active = extraServices.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      setExtraServices(prev =>
                        active ? prev.filter(x => x !== s) : [...prev, s],
                      )
                    }
                    className={`px-3 h-7 rounded-full text-xs transition-colors ${
                      active
                        ? 'bg-brand text-white border-brand'
                        : 'border border-slate-200 text-slate-600 hover:border-brand'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1">
              <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Экстренные контакты
              </label>
              <button
                type="button"
                onClick={() => addRow('contacts')}
                className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
              >
                <Plus size={12} /> Добавить
              </button>
            </div>
            <ContactList
              rows={contacts}
              onUpdate={(i, patch) => updateRow('contacts', i, patch)}
              onRemove={i => removeRow('contacts', i)}
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1">
              <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Кто может забирать
              </label>
              <button
                type="button"
                onClick={() => addRow('representatives')}
                className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
              >
                <Plus size={12} /> Добавить
              </button>
            </div>
            <ContactList
              rows={representatives}
              onUpdate={(i, patch) => updateRow('representatives', i, patch)}
              onRemove={i => removeRow('representatives', i)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
              Заметки
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

function ParentLinkList({
  rows,
  onUpdate,
  onRemove,
}: {
  rows: ParentLinkDraft[];
  onUpdate: (i: number, patch: Partial<ParentLinkDraft>) => void;
  onRemove: (i: number) => void;
}) {
  if (rows.length === 0) {
    return <div className="text-xs text-slate-400">Никто не привязан</div>;
  }
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div
          key={r.id || `new-${i}`}
          className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_1fr_auto] gap-2 items-center"
        >
          <input
            placeholder="ФИО родителя"
            value={r.name}
            onChange={e => onUpdate(i, { name: e.target.value })}
            className={inputCls}
          />
          <input
            placeholder="Email"
            type="email"
            value={r.email}
            disabled={Boolean(r.id)}
            onChange={e => onUpdate(i, { email: e.target.value })}
            className={`${inputCls} ${r.id ? 'bg-slate-50 text-slate-500' : ''}`}
          />
          <input
            placeholder="Телефон"
            value={r.phone || ''}
            onChange={e => onUpdate(i, { phone: e.target.value })}
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="h-10 px-3 rounded-xl text-slate-400 hover:text-danger hover:bg-danger/10 transition-colors"
            aria-label="Отвязать"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function ParentPicker({
  available,
  query,
  onQuery,
  onPick,
  onCreate,
  onClose,
}: {
  available: { id: string; name: string; email: string; phone?: string }[];
  query: string;
  onQuery: (q: string) => void;
  onPick: (p: ParentLinkDraft) => void;
  onCreate: (p: ParentLinkDraft) => void;
  onClose: () => void;
}) {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? available.filter(p =>
        [p.name, p.email, p.phone].filter(Boolean).some(v => String(v).toLowerCase().includes(q)),
      )
    : available;

  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
        <input
          autoFocus
          placeholder="Поиск по имени, email…"
          value={query}
          onChange={e => onQuery(e.target.value)}
          className="flex-1 h-8 text-sm bg-transparent outline-none placeholder:text-slate-400"
        />
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700"
          aria-label="Закрыть"
        >
          <X size={14} />
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-xs text-slate-400">
            Нет совпадений среди существующих родителей.
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {filtered.map(p => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onPick({ id: p.id, name: p.name, email: p.email, phone: p.phone })}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors"
                >
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-slate-500">
                    {[p.email, p.phone].filter(Boolean).join(' · ')}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-slate-100 p-3 bg-slate-50/40">
        <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">
          Или пригласить нового
        </div>
        <ParentCreateMini onCreate={onCreate} />
      </div>
    </div>
  );
}

function ParentCreateMini({ onCreate }: { onCreate: (p: ParentLinkDraft) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const valid = name.trim().length > 1 && /.+@.+\..+/.test(email);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2">
      <input
        placeholder="ФИО"
        value={name}
        onChange={e => setName(e.target.value)}
        className={inputCls}
      />
      <input
        placeholder="Email"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className={inputCls}
      />
      <input
        placeholder="Телефон"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        className={inputCls}
      />
      <button
        type="button"
        disabled={!valid}
        onClick={() => onCreate({ name: name.trim(), email: email.trim(), phone: phone.trim() })}
        className="h-10 px-3 rounded-xl bg-brand text-white text-sm hover:bg-brand-soft disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Пригласить
      </button>
    </div>
  );
}

function ContactList({
  rows,
  onUpdate,
  onRemove,
}: {
  rows: ContactDraft[];
  onUpdate: (i: number, patch: Partial<ContactDraft>) => void;
  onRemove: (i: number) => void;
}) {
  if (rows.length === 0) {
    return <div className="text-xs text-slate-400">Не указаны</div>;
  }
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_1fr_auto] gap-2 items-center">
          <input
            placeholder="Имя"
            value={r.name}
            onChange={e => onUpdate(i, { name: e.target.value })}
            className={inputCls}
          />
          <input
            placeholder="Телефон"
            value={r.phone}
            onChange={e => onUpdate(i, { phone: e.target.value })}
            className={inputCls}
          />
          <input
            placeholder="Кто (бабушка, отец…)"
            value={r.relation}
            onChange={e => onUpdate(i, { relation: e.target.value })}
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="h-10 px-3 rounded-xl text-slate-400 hover:text-danger hover:bg-danger/10 transition-colors"
            aria-label="Удалить"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
