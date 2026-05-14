'use client';
import { useEffect, useMemo, useState } from 'react';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, SectionLabel } from '@/components/ui';
import api from '@/lib/api';
import { Child } from '@/lib/types';

type Status = 'present' | 'sick' | 'vacation' | 'absent';
interface Attendance { id: string; date: string; status: Status; }

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const WEEKDAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

const STATUS_BG: Record<Status, string> = {
  present: 'bg-success/40 text-emerald-900',
  sick: 'bg-danger/50 text-red-900',
  vacation: 'bg-warn/50 text-orange-900',
  absent: 'bg-slate-100 text-slate-500',
};

const STATUS_DOT: Record<Status, string> = {
  present: 'bg-success',
  sick: 'bg-danger',
  vacation: 'bg-warn',
  absent: 'bg-slate-300',
};

const STATUS_LABEL: Record<Status, string> = {
  present: 'Присутствие',
  sick: 'Болезнь',
  vacation: 'Отпуск',
  absent: 'Отсутствие',
};

/** Returns array of length matching calendar grid: leading empties + day numbers + trailing empties. */
function monthGrid(year: number, monthIdx: number): (number | null)[] {
  const first = new Date(year, monthIdx, 1);
  // Convert Sun=0..Sat=6 to Mon=0..Sun=6
  const startWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const cells: (number | null)[] = Array(startWeekday).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function AttendancePage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState('');
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

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

  const byDay = useMemo(() => {
    const map = new Map<number, Status>();
    for (const a of attendance) {
      const d = new Date(a.date);
      if (d.getFullYear() === cursor.year && d.getMonth() === cursor.month) {
        map.set(d.getDate(), a.status);
      }
    }
    return map;
  }, [attendance, cursor]);

  const stats = useMemo(() => {
    let present = 0, sick = 0, vacation = 0, absent = 0;
    byDay.forEach(s => {
      if (s === 'present') present++;
      else if (s === 'sick') sick++;
      else if (s === 'vacation') vacation++;
      else absent++;
    });
    const total = present + sick + vacation + absent;
    const pct = total ? Math.round((present / total) * 100) : 0;
    return { present, sick, vacation, absent, pct };
  }, [byDay]);

  const cells = monthGrid(cursor.year, cursor.month);

  const shiftMonth = (delta: number) => {
    setCursor(c => {
      const m = c.month + delta;
      if (m < 0) return { year: c.year - 1, month: 11 };
      if (m > 11) return { year: c.year + 1, month: 0 };
      return { year: c.year, month: m };
    });
  };

  return (
    <PageLayout
      eyebrow={`Посещения · ${MONTH_NAMES[cursor.month]}`}
      title="Посещаемость"
      actions={
        <Button variant="outline" size="sm">
          <Download size={16} />
          Экспорт
        </Button>
      }
    >
      {children.length > 1 && (
        <div className="mb-4">
          <select
            value={childId}
            onChange={e => setChildId(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Calendar */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-serif text-2xl">
              {MONTH_NAMES[cursor.month]} <span className="italic text-slate-500">{cursor.year}</span>
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => shiftMonth(-1)}
                className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => shiftMonth(1)}
                className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
            {WEEKDAYS.map(w => (
              <div key={w} className="text-[10px] font-medium uppercase tracking-wider text-slate-500 pb-2">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const status = byDay.get(day);
              const cls = status
                ? STATUS_BG[status]
                : 'bg-white border border-slate-100 text-slate-400';
              return (
                <div
                  key={i}
                  className={`aspect-square rounded-xl flex items-start justify-end p-2 text-sm font-medium ${cls}`}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Stats */}
        <Card padding="md">
          <SectionLabel>Статистика месяца</SectionLabel>
          <div className="mt-3 mb-6">
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-5xl">{stats.pct}</span>
              <span className="text-sm text-slate-500">% посещений</span>
            </div>
          </div>
          <ul className="space-y-3">
            {(['present', 'sick', 'vacation', 'absent'] as Status[]).map(s => (
              <li key={s} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
                  {STATUS_LABEL[s]}
                </span>
                <span className="text-slate-500">
                  {stats[s]} <span className="text-xs">дн.</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PageLayout>
  );
}
