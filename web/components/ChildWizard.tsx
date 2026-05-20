'use client';
import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check, Plus, UserPlus, Mail } from 'lucide-react';
import { Card, Button, SectionLabel } from '@/components/ui';
import api from '@/lib/api';
import { Group } from '@/lib/types';

const EXTRA_SERVICES = ['Логопед', 'Хореография', 'Музыка', 'Английский', 'Рисование', 'Плавание', 'Шахматы', 'Робототехника'];

const inputCls =
  'w-full h-11 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

interface ParentDraft {
  name: string;
  email: string;
  phone: string;
}

interface ContactDraft {
  name: string;
  phone: string;
  relation: string;
}

interface WizardData {
  name: string;
  birthDate: string;
  parents: ParentDraft[];
  groupId: string;
  extraServices: string[];
  startDate: string;
  allergies: string;
  contacts: ContactDraft[];
  representatives: ContactDraft[];
  notes: string;
  inAdaptation: boolean;
}

interface InviteResult {
  parentId: string;
  name: string;
  email: string;
  inviteToken: string;
}

interface ChildWizardProps {
  groups: Group[];
  onClose: () => void;
  onCreated: (child: { id: string; name: string }, invites: InviteResult[]) => void;
}

const TOTAL_STEPS = 5;

const emptyParent = (): ParentDraft => ({ name: '', email: '', phone: '' });

const emptyData = (): WizardData => ({
  name: '',
  birthDate: '',
  parents: [emptyParent()],
  groupId: '',
  extraServices: [],
  startDate: new Date().toISOString().slice(0, 10),
  allergies: '',
  contacts: [],
  representatives: [],
  notes: '',
  // По умолчанию новые дети помечаются как «в адаптации» — администратор
  // или педагог снимут тег когда ребёнок освоится в группе.
  inAdaptation: true,
});

export default function ChildWizard({ groups, onClose, onCreated }: ChildWizardProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(emptyData());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const update = <K extends keyof WizardData>(key: K, value: WizardData[K]) => {
    setData(p => ({ ...p, [key]: value }));
  };

  const canAdvance = (() => {
    if (step === 1) return data.name.trim().length > 1 && data.birthDate;
    if (step === 2) {
      return data.parents.some(p => p.name.trim() && p.email.trim());
    }
    if (step === 3) return true;
    if (step === 4) return true;
    return true;
  })();

  const submit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const cleanParents = data.parents.filter(p => p.name.trim() && p.email.trim());
      const { data: child } = await api.post('/admin/children', {
        name: data.name.trim(),
        birthDate: data.birthDate,
        parentLinks: cleanParents,
        groupId: data.groupId || undefined,
        extraServices: data.extraServices,
        allergies: data.allergies || undefined,
        contacts: data.contacts.filter(c => c.name.trim() || c.phone.trim()),
        representatives: data.representatives.filter(c => c.name.trim() || c.phone.trim()),
        notes: data.notes || undefined,
        inAdaptation: data.inAdaptation,
      });
      onCreated({ id: child.id, name: child.name }, child.invites || []);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Не удалось создать карточку ребёнка');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-foreground/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-3xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div className="flex-1">
            <SectionLabel>Зачисление ребёнка</SectionLabel>
            <h3 className="font-serif text-2xl mt-1">Шаг {step} из {TOTAL_STEPS}</h3>
            {/* Progress bar */}
            <div className="mt-3 flex gap-1">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i + 1 <= step ? 'bg-brand' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-foreground ml-3"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 && <Step1 data={data} update={update} />}
          {step === 2 && <Step2 data={data} update={update} />}
          {step === 3 && <Step3 data={data} update={update} groups={groups} />}
          {step === 4 && <Step4 data={data} update={update} />}
          {step === 5 && <Step5 data={data} groups={groups} />}

          {error && (
            <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 text-red-900 px-3 py-2 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ChevronLeft size={16} /> Назад
          </Button>
          <div className="text-xs text-slate-500">
            {step === 5 ? 'Проверьте данные и подтвердите' : `Шаг ${step} из ${TOTAL_STEPS}`}
          </div>
          {step < TOTAL_STEPS ? (
            <Button
              variant="primary"
              onClick={() => setStep(s => Math.min(TOTAL_STEPS, s + 1))}
              disabled={!canAdvance}
            >
              Далее <ChevronRight size={16} />
            </Button>
          ) : (
            <Button variant="primary" onClick={submit} disabled={submitting}>
              <Check size={16} />
              {submitting ? 'Создаём…' : 'Создать и пригласить'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Шаги
// ──────────────────────────────────────────────────────────

function Step1({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h4 className="font-serif text-2xl mb-1">О ребёнке</h4>
        <p className="text-sm text-slate-500">Основные данные для зачисления.</p>
      </div>
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
          ФИО ребёнка
        </label>
        <input
          value={data.name}
          onChange={e => update('name', e.target.value)}
          placeholder="Иванова Анна Сергеевна"
          autoFocus
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
          Дата рождения
        </label>
        <input
          type="date"
          value={data.birthDate}
          onChange={e => update('birthDate', e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          className={inputCls}
        />
      </div>
      <label className="flex items-start gap-2.5 cursor-pointer p-3 rounded-xl border border-slate-200 hover:border-brand transition-colors">
        <input
          type="checkbox"
          checked={data.inAdaptation}
          onChange={e => update('inAdaptation', e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand shrink-0"
        />
        <div>
          <div className="text-sm font-medium">Период адаптации</div>
          <div className="text-xs text-slate-500 mt-0.5">
            Новый ребёнок — выделим бейджем у педагога и админа. Снимется потом вручную, когда освоится.
          </div>
        </div>
      </label>
    </div>
  );
}

function Step2({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void }) {
  const updateParent = (i: number, field: keyof ParentDraft, value: string) => {
    update('parents', data.parents.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  };
  const remove = (i: number) => {
    if (data.parents.length === 1) return;
    update('parents', data.parents.filter((_, idx) => idx !== i));
  };
  const add = () => update('parents', [...data.parents, emptyParent()]);

  return (
    <div className="space-y-5">
      <div>
        <h4 className="font-serif text-2xl mb-1">Родители</h4>
        <p className="text-sm text-slate-500">
          Каждому родителю с email автоматически придёт ссылка для входа в личный кабинет.
        </p>
      </div>
      <div className="space-y-3">
        {data.parents.map((p, i) => (
          <Card key={i} padding="md" className="relative">
            {data.parents.length > 1 && (
              <button
                onClick={() => remove(i)}
                className="absolute top-3 right-3 p-1 text-slate-400 hover:text-danger transition-colors"
              >
                <X size={16} />
              </button>
            )}
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-3">
              Родитель {i + 1}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-500 mb-1">ФИО</label>
                <input
                  value={p.name}
                  onChange={e => updateParent(i, 'name', e.target.value)}
                  placeholder="Иванов Сергей Петрович"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Email *</label>
                <input
                  type="email"
                  value={p.email}
                  onChange={e => updateParent(i, 'email', e.target.value)}
                  placeholder="parent@example.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Телефон</label>
                <input
                  value={p.phone}
                  onChange={e => updateParent(i, 'phone', e.target.value)}
                  placeholder="+7 …"
                  className={inputCls}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
      <button
        onClick={add}
        className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
      >
        <UserPlus size={14} /> Добавить родителя
      </button>
    </div>
  );
}

function Step3({
  data, update, groups,
}: {
  data: WizardData;
  update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void;
  groups: Group[];
}) {
  const toggleService = (s: string) => {
    const next = data.extraServices.includes(s)
      ? data.extraServices.filter(x => x !== s)
      : [...data.extraServices, s];
    update('extraServices', next);
  };

  return (
    <div className="space-y-5">
      <div>
        <h4 className="font-serif text-2xl mb-1">Группа и услуги</h4>
        <p className="text-sm text-slate-500">Куда зачисляем и какие занятия посещает.</p>
      </div>
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
          Группа
        </label>
        <select
          value={data.groupId}
          onChange={e => update('groupId', e.target.value)}
          className={inputCls}
        >
          <option value="">Без группы — назначим позже</option>
          {groups.map(g => (
            <option key={g.id} value={g.id}>
              {g.name} · {g.ageRange} лет
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
          Дата зачисления
        </label>
        <input
          type="date"
          value={data.startDate}
          onChange={e => update('startDate', e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-2">
          Дополнительные услуги
        </label>
        <div className="flex flex-wrap gap-2">
          {EXTRA_SERVICES.map(s => {
            const active = data.extraServices.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleService(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  active
                    ? 'bg-brand text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Step4({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void }) {
  const updateContact = (list: 'contacts' | 'representatives', i: number, field: keyof ContactDraft, value: string) => {
    update(list, data[list].map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  };
  const addContact = (list: 'contacts' | 'representatives') => {
    update(list, [...data[list], { name: '', phone: '', relation: '' }]);
  };
  const removeContact = (list: 'contacts' | 'representatives', i: number) => {
    update(list, data[list].filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-5">
      <div>
        <h4 className="font-serif text-2xl mb-1">Здоровье и контакты</h4>
        <p className="text-sm text-slate-500">Аллергии, экстренные номера, кто может забирать.</p>
      </div>
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
          Аллергии и особенности здоровья
        </label>
        <textarea
          value={data.allergies}
          onChange={e => update('allergies', e.target.value)}
          rows={3}
          placeholder="Аллергия на орехи, непереносимость лактозы…"
          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
        />
      </div>

      {(['contacts', 'representatives'] as const).map(list => {
        const label = list === 'contacts' ? 'Экстренные контакты' : 'Кто может забирать';
        return (
          <div key={list}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                {label}
              </label>
              <button
                onClick={() => addContact(list)}
                className="text-xs text-brand hover:underline inline-flex items-center gap-1"
              >
                <Plus size={12} /> Добавить
              </button>
            </div>
            <div className="space-y-2">
              {data[list].map((c, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                  <input
                    value={c.name}
                    onChange={e => updateContact(list, i, 'name', e.target.value)}
                    placeholder="Имя"
                    className={inputCls}
                  />
                  <input
                    value={c.phone}
                    onChange={e => updateContact(list, i, 'phone', e.target.value)}
                    placeholder="Телефон"
                    className={inputCls}
                  />
                  <input
                    value={c.relation}
                    onChange={e => updateContact(list, i, 'relation', e.target.value)}
                    placeholder="Кем приходится"
                    className={inputCls}
                  />
                  <button
                    onClick={() => removeContact(list, i)}
                    className="text-slate-400 hover:text-danger transition-colors p-1"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              {data[list].length === 0 && (
                <div className="text-xs text-slate-400 italic">Не указано</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Step5({ data, groups }: { data: WizardData; groups: Group[] }) {
  const group = groups.find(g => g.id === data.groupId);
  const validParents = data.parents.filter(p => p.name.trim() && p.email.trim());
  return (
    <div className="space-y-5">
      <div>
        <h4 className="font-serif text-2xl mb-1">Проверка данных</h4>
        <p className="text-sm text-slate-500">
          Убедитесь что всё верно. Родителям с email{' '}
          <span className="inline-flex items-center gap-1 text-foreground">
            <Mail size={12} /> {validParents.length}
          </span>{' '}
          сразу уйдёт ссылка для входа.
        </p>
      </div>

      <Card padding="md">
        <SectionLabel>Ребёнок</SectionLabel>
        <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-slate-500">ФИО</div>
            <div className="font-medium">{data.name || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Дата рождения</div>
            <div className="font-medium">
              {data.birthDate ? new Date(data.birthDate).toLocaleDateString('ru-RU') : '—'}
            </div>
          </div>
        </div>
      </Card>

      <Card padding="md">
        <SectionLabel>Родители ({validParents.length})</SectionLabel>
        <ul className="mt-2 space-y-2">
          {validParents.map((p, i) => (
            <li key={i} className="text-sm flex items-baseline justify-between gap-3">
              <span className="font-medium">{p.name}</span>
              <span className="text-xs text-slate-500 truncate">{p.email}</span>
            </li>
          ))}
          {validParents.length === 0 && (
            <li className="text-sm text-warn">Не указано ни одного родителя</li>
          )}
        </ul>
      </Card>

      <Card padding="md">
        <SectionLabel>Группа и услуги</SectionLabel>
        <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-slate-500">Группа</div>
            <div className="font-medium">{group ? `${group.name} · ${group.ageRange} лет` : '—'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Зачисление</div>
            <div className="font-medium">
              {data.startDate ? new Date(data.startDate).toLocaleDateString('ru-RU') : '—'}
            </div>
          </div>
          {data.extraServices.length > 0 && (
            <div className="col-span-2">
              <div className="text-xs text-slate-500 mb-1">Доп. услуги</div>
              <div className="flex flex-wrap gap-1.5">
                {data.extraServices.map(s => (
                  <span key={s} className="px-2 py-0.5 rounded-full bg-brand-pale text-brand text-xs">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {(data.allergies || data.contacts.length > 0 || data.representatives.length > 0) && (
        <Card padding="md">
          <SectionLabel>Здоровье и контакты</SectionLabel>
          <div className="mt-2 text-sm space-y-2">
            {data.allergies && (
              <div>
                <div className="text-xs text-slate-500">Аллергии</div>
                <div className="text-foreground whitespace-pre-wrap">{data.allergies}</div>
              </div>
            )}
            {data.contacts.length > 0 && (
              <div>
                <div className="text-xs text-slate-500">Экстренные контакты: {data.contacts.length}</div>
              </div>
            )}
            {data.representatives.length > 0 && (
              <div>
                <div className="text-xs text-slate-500">Кто может забирать: {data.representatives.length}</div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
