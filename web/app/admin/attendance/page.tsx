'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, AlertCircle, Loader2 } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card } from '@/components/ui';
import api from '@/lib/api';
import { Child } from '@/lib/types';

interface Group { id: string; name: string; }
type Status = 'present' | 'absent' | 'sick' | 'vacation';

const STATUS_OPTS: { value: Status; letter: string; title: string; cls: string; activeCls: string }[] = [
  { value: 'present', letter: 'П', title: 'Присутствует', cls: 'text-emerald-900', activeCls: 'bg-success/50 ring-success' },
  { value: 'absent', letter: 'Н', title: 'Отсутствует', cls: 'text-slate-700', activeCls: 'bg-slate-200 ring-slate-400' },
  { value: 'sick', letter: 'Б', title: 'Болеет', cls: 'text-red-900', activeCls: 'bg-danger/50 ring-danger' },
  { value: 'vacation', letter: 'О', title: 'Отпуск', cls: 'text-orange-900', activeCls: 'bg-warn/50 ring-warn' },
];

const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function getWeekDates(baseDate: Date): Date[] {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const dates: Date[] = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date);
  }
  return dates;
}

const fmt = (d: Date) => d.toISOString().split('T')[0];

export default function AdminAttendance() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [weekBase, setWeekBase] = useState(() => new Date());
  const [attendance, setAttendance] = useState<Record<string, Record<string, Status>>>({});
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const pendingDatesRef = useRef<Set<string>>(new Set());
  const dirtyAttendanceRef = useRef<Record<string, Record<string, Status>>>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([api.get('/admin/groups'), api.get('/admin/children')]).then(([g, c]) => {
      setGroups(g.data);
      setChildren(c.data);
      if (g.data.length > 0) setSelectedGroup(g.data[0].id);
    });
  }, []);

  const weekDates = useMemo(() => getWeekDates(weekBase), [weekBase]);

  useEffect(() => {
    if (!selectedGroup) return;
    setLoading(true);
    const promises = weekDates.map(d =>
      api
        .get('/admin/attendance', { params: { groupId: selectedGroup, date: fmt(d) } })
        .then(res => ({ date: fmt(d), records: res.data as { childId: string; status: Status }[] }))
        .catch(() => ({ date: fmt(d), records: [] as { childId: string; status: Status }[] })),
    );
    Promise.all(promises)
      .then(results => {
        const map: Record<string, Record<string, Status>> = {};
        results.forEach(({ date, records }) => {
          records.forEach(a => {
            if (!map[a.childId]) map[a.childId] = {};
            map[a.childId][date] = a.status;
          });
        });
        setAttendance(map);
      })
      .finally(() => setLoading(false));
  }, [selectedGroup, weekDates]);

  const groupChildren = children.filter(c => c.groupId === selectedGroup && c.status === 'active');

  // Keep a ref of the latest attendance for the debounced flush
  useEffect(() => { dirtyAttendanceRef.current = attendance; }, [attendance]);

  const flushPending = async () => {
    if (!selectedGroup || pendingDatesRef.current.size === 0) return;
    const dates = Array.from(pendingDatesRef.current);
    pendingDatesRef.current = new Set();
    setSaveStatus('saving');
    try {
      await Promise.all(
        dates.map(date => {
          const records = groupChildren
            .filter(c => dirtyAttendanceRef.current[c.id]?.[date])
            .map(c => ({ childId: c.id, status: dirtyAttendanceRef.current[c.id][date] }));
          return api.post('/admin/attendance', { groupId: selectedGroup, date, records });
        }),
      );
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(s => (s === 'saved' ? 'idle' : s)), 1500);
    } catch {
      setSaveStatus('error');
    }
  };

  const scheduleSave = (date: string) => {
    pendingDatesRef.current.add(date);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => flushPending(), 600);
  };

  // Flush on tab hide/unmount
  useEffect(() => {
    const onHide = () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        flushPending();
      }
    };
    window.addEventListener('beforeunload', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('beforeunload', onHide);
      document.removeEventListener('visibilitychange', onHide);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup]);

  const setStatus = (childId: string, date: string, status: Status) => {
    setAttendance(prev => ({
      ...prev,
      [childId]: { ...(prev[childId] || {}), [date]: status },
    }));
    scheduleSave(date);
  };

  const markAllDay = (date: string, status: Status) => {
    setAttendance(prev => {
      const next = { ...prev };
      groupChildren.forEach(c => {
        next[c.id] = { ...(next[c.id] || {}), [date]: status };
      });
      return next;
    });
    scheduleSave(date);
  };

  const today = fmt(new Date());

  const monthRangeLabel = () => {
    const first = weekDates[0];
    const last = weekDates[weekDates.length - 1];
    if (first.getMonth() === last.getMonth()) {
      return `${first.getDate()}–${last.getDate()} ${first.toLocaleDateString('ru-RU', { month: 'long' })}`;
    }
    return `${first.getDate()} ${first.toLocaleDateString('ru-RU', { month: 'short' })} – ${last.getDate()} ${last.toLocaleDateString('ru-RU', { month: 'short' })}`;
  };

  return (
    <PageLayout
      eyebrow={`Неделя · ${monthRangeLabel()}`}
      title="Посещаемость"
      wide
      actions={
        <span className="inline-flex items-center gap-1.5 text-xs px-3 h-9 rounded-full bg-slate-50 text-slate-500 min-w-[140px] justify-center">
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
              Ошибка сохранения
            </>
          ) : (
            <>
              <Check size={12} />
              Автосохранение
            </>
          )}
        </span>
      }
    >
      <Card padding="md" className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
              Группа
            </label>
            <select
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="" disabled>Выберите группу</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const d = new Date(weekBase);
                d.setDate(d.getDate() - 7);
                setWeekBase(d);
              }}
              className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setWeekBase(new Date())}
              className="px-3 h-9 rounded-full border border-slate-200 text-sm hover:bg-slate-50"
            >
              Сегодня
            </button>
            <button
              onClick={() => {
                const d = new Date(weekBase);
                d.setDate(d.getDate() + 7);
                setWeekBase(d);
              }}
              className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </Card>

      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedDay(null)}
          className={`px-3 h-9 rounded-full text-sm whitespace-nowrap transition-colors ${
            selectedDay === null ? 'bg-brand text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Вся неделя
        </button>
        {weekDates.map((d, i) => {
          const dateStr = fmt(d);
          const isToday = dateStr === today;
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          const active = selectedDay === i;
          return (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              className={`px-3 h-9 rounded-full text-sm whitespace-nowrap transition-colors ${
                active
                  ? 'bg-brand text-white'
                  : isToday
                  ? 'bg-brand-pale text-brand'
                  : isWeekend
                  ? 'border border-slate-100 text-slate-400'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {DAY_NAMES[d.getDay()]} {d.getDate()}
            </button>
          );
        })}
      </div>

      {loading ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-8 text-center">Загрузка…</div>
        </Card>
      ) : groupChildren.length === 0 ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-12 text-center">
            В этой группе нет активных детей
          </div>
        </Card>
      ) : selectedDay !== null ? (
        (() => {
          const d = weekDates[selectedDay];
          const dateStr = fmt(d);
          return (
            <Card padding="none" className="overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    {DAY_NAMES[d.getDay()]} · {d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                  </div>
                  <h3 className="font-serif text-xl mt-0.5">{groupChildren.length} детей</h3>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-500">Все:</span>
                  <button
                    onClick={() => markAllDay(dateStr, 'present')}
                    className="text-emerald-700 hover:underline"
                  >
                    Пришли
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    onClick={() => markAllDay(dateStr, 'absent')}
                    className="text-slate-600 hover:underline"
                  >
                    Не пришли
                  </button>
                </div>
              </div>
              <ul className="divide-y divide-slate-100">
                {groupChildren.map(child => {
                  const current = attendance[child.id]?.[dateStr] || '';
                  return (
                    <li key={child.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50/40">
                      <span className="font-medium text-sm">{child.name}</span>
                      <div className="flex gap-1.5">
                        {STATUS_OPTS.map(opt => {
                          const active = current === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => setStatus(child.id, dateStr, opt.value)}
                              title={opt.title}
                              className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${
                                active
                                  ? `${opt.activeCls} ring-2 ring-offset-2 ${opt.cls}`
                                  : 'border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              {opt.letter}
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })()
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/40">
                  <th className="sticky left-0 bg-slate-50/40 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-5 py-3">
                    Ребёнок
                  </th>
                  {weekDates.map((d, i) => {
                    const isToday = fmt(d) === today;
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <th
                        key={i}
                        className={`text-center text-[11px] font-medium uppercase tracking-wider px-2 py-3 min-w-[100px] ${
                          isToday ? 'text-brand' : isWeekend ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        <div>{DAY_NAMES[d.getDay()]}</div>
                        <div className="text-[10px] font-normal mt-0.5 text-slate-400">
                          {d.getDate()}.{String(d.getMonth() + 1).padStart(2, '0')}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupChildren.map(child => (
                  <tr key={child.id}>
                    <td className="sticky left-0 bg-white px-5 py-2 font-medium text-sm whitespace-nowrap">
                      {child.name}
                    </td>
                    {weekDates.map((d, i) => {
                      const dateStr = fmt(d);
                      const st = attendance[child.id]?.[dateStr] || '';
                      const opt = STATUS_OPTS.find(o => o.value === st);
                      return (
                        <td key={i} className="px-1 py-2 text-center">
                          <select
                            value={st}
                            onChange={e => setStatus(child.id, dateStr, e.target.value as Status)}
                            className={`h-8 w-full text-center text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-brand/20 ${
                              opt ? `${opt.activeCls.split(' ')[0]} ${opt.cls} border-transparent` : 'border-slate-200 text-slate-400'
                            }`}
                          >
                            <option value="">—</option>
                            {STATUS_OPTS.map(o => (
                              <option key={o.value} value={o.value}>
                                {o.letter} {o.title}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageLayout>
  );
}
