'use client';
import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button } from '@/components/ui';
import api from '@/lib/api';
import { Group, Schedule, User, DAY_NAMES } from '@/lib/types';

type LessonForm = {
  groupId: string;
  dayOfWeek: number;
  timeStart: string;
  timeEnd: string;
  activity: string;
  teacherId: string;
  note: string;
};

const emptyForm: LessonForm = {
  groupId: '', dayOfWeek: 1, timeStart: '', timeEnd: '', activity: '', teacherId: '', note: '',
};

const FULL_DAYS = ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];

const inputCls =
  'w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

export default function AdminSchedule() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [schedule, setSchedule] = useState<Schedule[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<LessonForm>(emptyForm);

  useEffect(() => {
    api.get('/admin/groups').then(r => {
      setGroups(r.data);
      if (r.data[0]) setSelectedGroup(r.data[0].id);
    });
    api.get('/admin/staff').then(r => setTeachers(r.data.filter((u: User) => u.role === 'teacher')));
  }, []);

  useEffect(() => {
    if (!selectedGroup) return;
    api.get(`/groups/${selectedGroup}/schedule`).then(r => setSchedule(r.data));
  }, [selectedGroup]);

  const groupData = groups.find(g => g.id === selectedGroup);

  const byDay = useMemo(
    () =>
      DAY_NAMES.slice(1).map((label, i) => {
        const day = i + 1;
        return {
          day,
          label,
          items: schedule
            .filter(item => item.dayOfWeek === day)
            .sort((a, b) => a.timeStart.localeCompare(b.timeStart)),
        };
      }),
    [schedule],
  );

  const openAddModal = (dayOfWeek: number) => {
    setForm({
      ...emptyForm,
      groupId: selectedGroup,
      dayOfWeek,
      teacherId: groupData?.teacher?.id || '',
    });
    setModalOpen(true);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find(t => t.id === form.teacherId);
    const description = [
      teacher ? `Педагог: ${teacher.name}` : '',
      form.note.trim(),
    ].filter(Boolean).join('\n');
    const payload = {
      dayOfWeek: form.dayOfWeek,
      timeStart: form.timeStart,
      timeEnd: form.timeEnd,
      activity: form.activity,
      description: description || undefined,
    };
    const { data } = await api.post(`/groups/${form.groupId}/schedule`, payload);
    if (form.groupId === selectedGroup) setSchedule(prev => [...prev, data]);
    else setSelectedGroup(form.groupId);
    setModalOpen(false);
    setForm(emptyForm);
  };

  const del = async (id: string) => {
    if (!confirm('Удалить занятие?')) return;
    await api.delete(`/groups/${selectedGroup}/schedule/${id}`);
    setSchedule(prev => prev.filter(s => s.id !== id));
  };

  return (
    <PageLayout
      eyebrow={groupData?.name ? `Группа «${groupData.name}»` : 'Расписание группы'}
      title="Расписание"
      wide
    >
      <Card padding="md" className="mb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
              Группа
            </label>
            <select
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
              className={`${inputCls} min-w-[220px]`}
            >
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          {groupData?.teacher && (
            <div className="text-sm text-slate-500">
              Педагог:{' '}
              <span className="font-medium text-foreground">{groupData.teacher.name}</span>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {byDay.map(day => (
          <Card key={day.day} padding="none" className="overflow-hidden min-h-[220px] flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 bg-brand-pale/30">
              <h3 className="font-serif text-base text-brand text-center">{day.label}</h3>
            </div>
            <div className="p-3 space-y-2 flex-1">
              {day.items.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-4">Нет занятий</div>
              ) : (
                day.items.map(item => (
                  <div
                    key={item.id}
                    className="group relative text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <div className="font-mono text-[11px] text-brand mb-0.5">
                      {item.timeStart} – {item.timeEnd}
                    </div>
                    <div className="font-medium text-sm">{item.activity}</div>
                    {item.description && (
                      <div className="text-slate-500 mt-1 whitespace-pre-wrap text-xs">
                        {item.description}
                      </div>
                    )}
                    <button
                      onClick={() => del(item.id)}
                      className="absolute top-1.5 right-1.5 p-1 text-slate-300 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => openAddModal(day.day)}
              className="m-3 mt-0 border border-dashed border-slate-300 text-slate-500 rounded-xl py-2 text-xs font-medium hover:border-brand hover:text-brand transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <Plus size={14} /> Добавить
            </button>
          </Card>
        ))}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <form
            onSubmit={create}
            className="bg-background rounded-3xl shadow-xl w-full max-w-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex items-start justify-between">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                  Новое занятие
                </div>
                <h3 className="font-serif text-2xl">{FULL_DAYS[form.dayOfWeek]}</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                  Группа
                </label>
                <select
                  value={form.groupId}
                  onChange={e => setForm(p => ({ ...p, groupId: e.target.value }))}
                  required
                  className={inputCls}
                >
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                    День
                  </label>
                  <select
                    value={form.dayOfWeek}
                    onChange={e => setForm(p => ({ ...p, dayOfWeek: +e.target.value }))}
                    className={inputCls}
                  >
                    {DAY_NAMES.slice(1).map((n, i) => (
                      <option key={i + 1} value={i + 1}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                    С
                  </label>
                  <input
                    type="time"
                    value={form.timeStart}
                    onChange={e => setForm(p => ({ ...p, timeStart: e.target.value }))}
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                    До
                  </label>
                  <input
                    type="time"
                    value={form.timeEnd}
                    onChange={e => setForm(p => ({ ...p, timeEnd: e.target.value }))}
                    required
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                  Занятие
                </label>
                <input
                  value={form.activity}
                  onChange={e => setForm(p => ({ ...p, activity: e.target.value }))}
                  placeholder="Монтессори-работа"
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                  Педагог
                </label>
                <select
                  value={form.teacherId}
                  onChange={e => setForm(p => ({ ...p, teacherId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Не указан</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                  Комментарий
                </label>
                <textarea
                  value={form.note}
                  onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                  rows={3}
                  placeholder="Кабинет, материалы, особенности…"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex gap-2">
              <Button type="submit" variant="primary">Добавить</Button>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Отмена
              </Button>
            </div>
          </form>
        </div>
      )}
    </PageLayout>
  );
}
