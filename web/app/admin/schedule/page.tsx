'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { Group, Schedule, DAY_NAMES } from '@/lib/types';

export default function AdminSchedule() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ dayOfWeek: 1, timeStart: '', timeEnd: '', activity: '' });

  useEffect(() => {
    api.get('/admin/groups').then(r => {
      setGroups(r.data);
      if (r.data[0]) setSelectedGroup(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedGroup) return;
    api.get(`/groups/${selectedGroup}/schedule`).then(r => setSchedule(r.data));
  }, [selectedGroup]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await api.post(`/groups/${selectedGroup}/schedule`, form);
    setSchedule(prev => [...prev, data]);
    setShowForm(false);
    setForm({ dayOfWeek: 1, timeStart: '', timeEnd: '', activity: '' });
  };

  const del = async (id: string) => {
    await api.delete(`/groups/${selectedGroup}/schedule/${id}`);
    setSchedule(prev => prev.filter(s => s.id !== id));
  };

  const byDay = DAY_NAMES.slice(1).map((_, i) => ({
    day: i + 1,
    label: DAY_NAMES[i + 1],
    items: schedule.filter(s => s.dayOfWeek === i + 1),
  }));

  return (
    <PageLayout title="Расписание групп">
      <div className="flex justify-between mb-4">
        <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} className="border rounded-lg px-3 py-2">
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">+ Занятие</button>
      </div>

      {showForm && (
        <form onSubmit={create} className="bg-white border rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <select value={form.dayOfWeek} onChange={e => setForm(p => ({...p, dayOfWeek: +e.target.value}))} className="border rounded px-3 py-2">
              {DAY_NAMES.slice(1).map((name, i) => <option key={i+1} value={i+1}>{name}</option>)}
            </select>
            <input type="time" value={form.timeStart} onChange={e => setForm(p => ({...p, timeStart: e.target.value}))} className="border rounded px-3 py-2" required />
            <input type="time" value={form.timeEnd} onChange={e => setForm(p => ({...p, timeEnd: e.target.value}))} className="border rounded px-3 py-2" required />
          </div>
          <input value={form.activity} onChange={e => setForm(p => ({...p, activity: e.target.value}))} placeholder="Занятие" className="w-full border rounded px-3 py-2" required />
          <div className="flex gap-2">
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">Добавить</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 px-4 py-2 text-sm">Отмена</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-5 gap-3">
        {byDay.map(d => (
          <div key={d.day} className="bg-white border rounded-xl overflow-hidden">
            <div className="bg-indigo-50 text-indigo-700 font-medium text-center py-2 text-sm">{d.label}</div>
            <div className="p-2 space-y-1">
              {d.items.map(item => (
                <div key={item.id} className="text-xs p-1.5 bg-gray-50 rounded group relative">
                  <div className="text-gray-400">{item.timeStart}–{item.timeEnd}</div>
                  <div>{item.activity}</div>
                  <button onClick={() => del(item.id)} className="absolute top-1 right-1 text-red-400 opacity-0 group-hover:opacity-100">×</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
