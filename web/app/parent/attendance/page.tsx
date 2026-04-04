'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { Child } from '@/lib/types';

interface Attendance { id: string; date: string; status: string; }

const STATUS_LABELS: Record<string, string> = {
  present: '✅ Присутствует',
  sick: '🤒 Болеет',
  vacation: '🏖️ Отпуск',
  absent: '❌ Отсутствует'
};

const STATUS_COLORS: Record<string, string> = {
  present: 'bg-green-50 text-green-700 border-green-200',
  sick: 'bg-orange-50 text-orange-700 border-orange-200',
  vacation: 'bg-blue-50 text-blue-700 border-blue-200',
  absent: 'bg-red-50 text-red-700 border-red-200',
};

const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

export default function ParentAttendance() {
  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState('');
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    api.get('/children').then(r => {
      setChildren(r.data);
      if (r.data[0]) setChildId(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!childId) return;
    api.get(`/children/${childId}/attendance`).then(r => setAttendance(r.data));
  }, [childId]);

  const [y, m] = month.split('-').map(Number);
  const monthAttendance = attendance.filter(a => {
    const d = new Date(a.date);
    return d.getFullYear() === y && d.getMonth() === m - 1;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Stats
  const stats = {
    present: monthAttendance.filter(a => a.status === 'present').length,
    sick: monthAttendance.filter(a => a.status === 'sick').length,
    vacation: monthAttendance.filter(a => a.status === 'vacation').length,
    absent: monthAttendance.filter(a => a.status === 'absent').length,
  };

  return (
    <PageLayout title="Посещаемость">
      <div className="flex flex-wrap gap-3 items-center mb-6">
        {children.length > 1 && (
          <select value={childId} onChange={e => setChildId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
      </div>

      {/* Month stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{stats.present}</div>
          <div className="text-xs text-green-600 mt-1">Присутствовал</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-orange-700">{stats.sick}</div>
          <div className="text-xs text-orange-600 mt-1">Болезнь</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{stats.vacation}</div>
          <div className="text-xs text-blue-600 mt-1">Отпуск</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-700">{stats.absent}</div>
          <div className="text-xs text-red-600 mt-1">Пропуск</div>
        </div>
      </div>

      {/* Attendance list */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <h3 className="font-medium text-sm text-gray-700">{MONTH_NAMES[m - 1]} {y}</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {monthAttendance.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">Нет данных за этот месяц</div>
          ) : monthAttendance.map(a => {
            const date = new Date(a.date);
            const dayName = date.toLocaleDateString('ru', { weekday: 'short' });
            return (
              <div key={a.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex flex-col items-center justify-center">
                    <span className="text-sm font-bold text-gray-700">{date.getDate()}</span>
                    <span className="text-[9px] text-gray-400 uppercase">{dayName}</span>
                  </div>
                  <span className="text-sm text-gray-700">{date.toLocaleDateString('ru', { month: 'long', day: 'numeric' })}</span>
                </div>
                <span className={`text-xs font-medium px-3 py-1.5 rounded-full border ${STATUS_COLORS[a.status] || ''}`}>
                  {STATUS_LABELS[a.status] || a.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </PageLayout>
  );
}
