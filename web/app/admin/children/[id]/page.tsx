'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import ChildEditCard from '@/components/ChildEditCard';
import { Card, SectionLabel, Button } from '@/components/ui';
import api from '@/lib/api';

interface SpecialistUser { id: string; name: string; role: string }

const ROLE_LABEL: Record<string, string> = {
  psychologist: 'Психолог',
  pediatrician: 'Педиатр',
};

interface AdminChild {
  id: string;
  name?: string;
  birthDate?: string;
  photo?: string | null;
  allergies?: string;
  extraServices?: string[];
  notes?: string;
  contacts?: { name: string; phone: string; relation: string }[];
  representatives?: { name: string; phone: string; relation: string }[];
  groupId?: string;
  group?: { id?: string; name?: string; teacher?: { name?: string } };
  parents?: { parent: { id: string; name: string; email?: string; phone?: string } }[];
  specialists?: { specialist: { id: string; name: string; role?: string } }[];
  attendance?: { id: string; date: string; status: string }[];
  status?: string;
  inAdaptation?: boolean;
}

export default function AdminChildDetail() {
  const { id } = useParams<{ id: string }>();
  const [child, setChild] = useState<AdminChild | null>(null);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [allSpecialists, setAllSpecialists] = useState<SpecialistUser[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [pickedSpecialistId, setPickedSpecialistId] = useState('');

  const reloadChild = () => api.get(`/admin/children/${id}`).then(r => setChild(r.data));

  useEffect(() => {
    reloadChild();
    api.get('/admin/groups').then(r => setGroups(r.data)).catch(() => {});
    api.get('/admin/staff').then(r =>
      setAllSpecialists(r.data.filter((u: SpecialistUser) => ['psychologist', 'pediatrician'].includes(u.role)))
    ).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const assignSpecialist = async () => {
    if (!pickedSpecialistId) return;
    const spec = allSpecialists.find(s => s.id === pickedSpecialistId);
    if (!spec) return;
    try {
      await api.post(`/admin/children/${id}/assign-specialist`, { specialistId: spec.id, role: spec.role });
      setAssignOpen(false);
      setPickedSpecialistId('');
      reloadChild();
    } catch (e: unknown) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Не удалось назначить');
    }
  };

  const removeSpecialist = async (specialistId: string) => {
    if (!confirm('Снять специалиста с ребёнка?')) return;
    try {
      await api.delete(`/admin/children/${id}/specialists/${specialistId}`);
      reloadChild();
    } catch (e: unknown) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Не удалось');
    }
  };

  if (!child) {
    return (
      <PageLayout>
        <p className="p-8 text-center text-slate-400">Загрузка…</p>
      </PageLayout>
    );
  }

  const parents = (child.parents || []).map(link => link.parent).filter(Boolean);

  const toggleAdaptation = async () => {
    const newVal = !child.inAdaptation;
    if (child.inAdaptation && !confirm(`Снять метку адаптации с ${child.name}?`)) return;
    try {
      await api.patch(`/admin/children/${id}/adaptation`, { value: newVal });
      setChild(prev => prev ? { ...prev, inAdaptation: newVal } : prev);
    } catch (e: unknown) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Не удалось');
    }
  };

  return (
    <PageLayout title={child.name} showBackButton>
      <div className="mb-4">
        <button
          onClick={toggleAdaptation}
          className={`inline-flex items-center gap-1.5 text-sm px-4 h-9 rounded-full border transition-colors ${
            child.inAdaptation
              ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
              : 'border-slate-200 text-slate-500 hover:border-brand hover:text-brand'
          }`}
        >
          {child.inAdaptation ? <>В адаптации · снять</> : <>Отметить как «в адаптации»</>}
        </button>
      </div>

      <ChildEditCard
        child={child}
        groups={groups}
        onUpdated={(c) => setChild(prev => ({ ...(prev || {}), ...(c as object) } as AdminChild))}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card padding="md">
          <SectionLabel>Родители</SectionLabel>
          {parents.length === 0 ? (
            <div className="text-sm text-slate-400 mt-2">Не привязаны</div>
          ) : (
            <ul className="mt-2 space-y-2">
              {parents.map(p => (
                <li key={p.id} className="text-sm">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-slate-500">
                    {[p.email, p.phone].filter(Boolean).join(' · ')}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between">
            <SectionLabel>Специалисты</SectionLabel>
            <button
              onClick={() => setAssignOpen(v => !v)}
              className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
            >
              <Plus size={13} /> Назначить
            </button>
          </div>
          {!child.specialists?.length ? (
            <div className="text-sm text-slate-400 mt-2">Не назначены</div>
          ) : (
            <ul className="mt-2 space-y-2">
              {child.specialists.map(link => (
                <li key={link.specialist.id} className="text-sm flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{link.specialist.name}</div>
                    <div className="text-xs text-slate-500">{ROLE_LABEL[link.specialist.role || ''] || link.specialist.role}</div>
                  </div>
                  <button
                    onClick={() => removeSpecialist(link.specialist.id)}
                    className="p-1 text-slate-400 hover:text-danger transition-colors shrink-0"
                    title="Снять"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {assignOpen && (() => {
            const assignedIds = new Set((child.specialists || []).map(s => s.specialist.id));
            const available = allSpecialists.filter(s => !assignedIds.has(s.id));
            return (
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                {available.length === 0 ? (
                  <div className="text-xs text-slate-400">Все специалисты уже назначены</div>
                ) : (
                  <>
                    <select
                      value={pickedSpecialistId}
                      onChange={e => setPickedSpecialistId(e.target.value)}
                      className="w-full h-9 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    >
                      <option value="">— Выбрать —</option>
                      {available.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} · {ROLE_LABEL[s.role] || s.role}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <Button type="button" variant="primary" size="sm" onClick={assignSpecialist}>
                        Назначить
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => { setAssignOpen(false); setPickedSpecialistId(''); }}
                      >
                        Отмена
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </Card>
      </div>

      <Card padding="md">
        <SectionLabel>Посещаемость · последние 14 дней</SectionLabel>
        {child.attendance?.length ? (
          <div className="flex gap-2 overflow-x-auto pb-2 mt-3">
            {child.attendance.map((record) => (
              <div
                key={record.id}
                className="flex flex-col items-center min-w-[64px] py-2 px-2 rounded-xl border border-slate-100 bg-slate-50/40"
              >
                <div className="text-[11px] text-slate-500 mb-1">
                  {new Date(record.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </div>
                <div
                  className={`text-xs font-medium ${
                    record.status === 'present'
                      ? 'text-emerald-700'
                      : record.status === 'absent'
                      ? 'text-slate-600'
                      : record.status === 'sick'
                      ? 'text-red-700'
                      : 'text-orange-700'
                  }`}
                >
                  {record.status === 'present'
                    ? 'Был(а)'
                    : record.status === 'absent'
                    ? 'Нет'
                    : record.status === 'sick'
                    ? 'Болеет'
                    : record.status === 'vacation'
                    ? 'Отпуск'
                    : '—'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-400 mt-2">Нет данных</div>
        )}
      </Card>
    </PageLayout>
  );
}
