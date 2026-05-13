'use client';
import { useEffect, useMemo, useState } from 'react';
import PageLayout from '@/components/PageLayout';
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
  groupId: '',
  dayOfWeek: 1,
  timeStart: '',
  timeEnd: '',
  activity: '',
  teacherId: '',
  note: '',
};

export default function AdminSchedule() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [showModal, setShowModal] = useState(false);
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

  const selectedGroupData = groups.find(g => g.id === selectedGroup);

  const byDay = useMemo(() => DAY_NAMES.slice(1).map((label, index) => {
    const day = index + 1;
    return {
      day,
      label,
      items: schedule
        .filter(item => item.dayOfWeek === day)
        .sort((a, b) => a.timeStart.localeCompare(b.timeStart)),
    };
  }), [schedule]);

  const openAddModal = (dayOfWeek: number) => {
    const defaultTeacherId = selectedGroupData?.teacher?.id || '';
    setForm({
      ...emptyForm,
      groupId: selectedGroup,
      dayOfWeek,
      teacherId: defaultTeacherId,
    });
    setShowModal(true);
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
    if (form.groupId === selectedGroup) {
      setSchedule(prev => [...prev, data]);
    } else {
      setSelectedGroup(form.groupId);
    }
    setShowModal(false);
    setForm(emptyForm);
  };

  const del = async (id: string) => {
    if (!confirm('Удалить занятие из расписания?')) return;
    await api.delete(`/groups/${selectedGroup}/schedule/${id}`);
    setSchedule(prev => prev.filter(s => s.id !== id));
  };

  return (
    <PageLayout title="Расписание групп">
      <div className="bg-white border rounded-xl p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end justify-between">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Группа</label>
            <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} className="border rounded-lg px-3 py-2 min-w-[220px]">
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          {selectedGroupData?.teacher && (
            <div className="text-sm text-gray-500">
              Основной педагог: <span className="font-medium text-gray-800">{selectedGroupData.teacher.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {byDay.map(day => (
          <div key={day.day} className="bg-white border rounded-xl overflow-hidden min-h-[220px] flex flex-col">
            <div className="bg-indigo-50 text-indigo-700 font-medium text-center py-2 text-sm">{day.label}</div>
            <div className="p-2 space-y-2 flex-1">
              {day.items.length === 0 && <div className="text-xs text-center text-gray-400 py-4">Нет занятий</div>}
              {day.items.map(item => (
                <div key={item.id} className="text-xs p-2 bg-gray-50 rounded-lg border group relative">
                  <div className="text-indigo-600 font-semibold">{item.timeStart} – {item.timeEnd}</div>
                  <div className="font-medium text-gray-900 mt-0.5">{item.activity}</div>
                  {item.description && <div className="text-gray-500 mt-1 whitespace-pre-wrap">{item.description}</div>}
                  <button onClick={() => del(item.id)} className="absolute top-1 right-1 text-red-400 opacity-0 group-hover:opacity-100">×</button>
                </div>
              ))}
            </div>
            <button onClick={() => openAddModal(day.day)} className="m-2 border border-dashed border-indigo-200 text-indigo-600 rounded-lg py-2 text-xs font-medium hover:bg-indigo-50">
              + Добавить занятие
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <form onSubmit={create} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Новое занятие</h3>
                <p className="text-sm text-gray-500">{DAY_NAMES[form.dayOfWeek]}</p>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Группа</label>
                <select value={form.groupId} onChange={e => setForm(p => ({ ...p, groupId: e.target.value }))} className="w-full border rounded-lg px-3 py-2" required>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">День</label>
                  <select value={form.dayOfWeek} onChange={e => setForm(p => ({ ...p, dayOfWeek: +e.target.value }))} className="w-full border rounded-lg px-3 py-2">
                    {DAY_NAMES.slice(1).map((name, index) => <option key={index + 1} value={index + 1}>{name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">С</label>
                  <input type="time" value={form.timeStart} onChange={e => setForm(p => ({ ...p, timeStart: e.target.value }))} className="w-full border rounded-lg px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">До</label>
                  <input type="time" value={form.timeEnd} onChange={e => setForm(p => ({ ...p, timeEnd: e.target.value }))} className="w-full border rounded-lg px-3 py-2" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Занятие</label>
                <input value={form.activity} onChange={e => setForm(p => ({ ...p, activity: e.target.value }))} placeholder="Монтессори-работа" className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Педагог</label>
                <select value={form.teacherId} onChange={e => setForm(p => ({ ...p, teacherId: e.target.value }))} className="w-full border rounded-lg px-3 py-2">
                  <option value="">Не указан</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Комментарий</label>
                <textarea value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} className="w-full border rounded-lg px-3 py-2 h-20" placeholder="Кабинет, материалы, особенности..." />
              </div>
            </div>
            <div className="p-5 border-t flex gap-2">
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">Добавить</button>
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">Отмена</button>
            </div>
          </form>
        </div>
      )}
    </PageLayout>
  );
}
