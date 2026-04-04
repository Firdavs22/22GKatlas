'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { Child } from '@/lib/types';

interface Group { id: string; name: string; }

const STATUS_OPTS = [
  { value: 'present', label: '✅', title: 'Присутствует', color: 'bg-green-100 text-green-700 ring-green-500' },
  { value: 'absent', label: '❌', title: 'Отсутствует', color: 'bg-red-100 text-red-700 ring-red-500' },
  { value: 'sick', label: '🤒', title: 'Болеет', color: 'bg-orange-100 text-orange-700 ring-orange-500' },
  { value: 'vacation', label: '🏖️', title: 'Отпуск', color: 'bg-blue-100 text-blue-700 ring-blue-500' },
];

const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function getWeekDates(baseDate: Date): Date[] {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d.setDate(diff));
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date);
  }
  return dates;
}

function fmt(d: Date) { return d.toISOString().split('T')[0]; }

export default function AdminAttendance() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [currentWeekBase, setCurrentWeekBase] = useState(() => new Date());
  const [weekDates, setWeekDates] = useState<Date[]>([]);

  // attendance[childId][dateStr] = status
  const [attendance, setAttendance] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null); // index into weekDates

  useEffect(() => {
    Promise.all([
      api.get('/admin/groups'),
      api.get('/admin/children')
    ]).then(([grpRes, chRes]) => {
      setGroups(grpRes.data);
      setChildren(chRes.data);
      if (grpRes.data.length > 0) setSelectedGroup(grpRes.data[0].id);
    });
  }, []);

  useEffect(() => {
    setWeekDates(getWeekDates(currentWeekBase));
  }, [currentWeekBase]);

  useEffect(() => {
    if (!selectedGroup || weekDates.length === 0) return;
    setLoading(true);

    // Load attendance for each weekday
    const promises = weekDates.map(d =>
      api.get('/admin/attendance', { params: { groupId: selectedGroup, date: fmt(d) } })
        .then(res => ({ date: fmt(d), records: res.data }))
        .catch(() => ({ date: fmt(d), records: [] }))
    );

    Promise.all(promises).then(results => {
      const map: Record<string, Record<string, string>> = {};
      results.forEach(({ date, records }) => {
        records.forEach((a: { childId: string; status: string }) => {
          if (!map[a.childId]) map[a.childId] = {};
          map[a.childId][date] = a.status;
        });
      });
      setAttendance(map);
    }).finally(() => setLoading(false));
  }, [selectedGroup, weekDates]);

  const groupChildren = children.filter(c => c.groupId === selectedGroup && c.status === 'active');

  const setStatus = (childId: string, dateStr: string, status: string) => {
    setAttendance(prev => ({
      ...prev,
      [childId]: { ...(prev[childId] || {}), [dateStr]: status }
    }));
  };

  const markAllDay = (dateStr: string, status: string) => {
    setAttendance(prev => {
      const next = { ...prev };
      groupChildren.forEach(c => {
        next[c.id] = { ...(next[c.id] || {}), [dateStr]: status };
      });
      return next;
    });
  };

  const saveDay = async (dateStr: string) => {
    if (!selectedGroup) return;
    setSaving(true);
    const records = groupChildren
      .filter(c => attendance[c.id]?.[dateStr])
      .map(c => ({ childId: c.id, status: attendance[c.id][dateStr] }));
    try {
      await api.post('/admin/attendance', { groupId: selectedGroup, date: dateStr, records });
      alert('Сохранено!');
    } catch { alert('Ошибка сохранения'); }
    finally { setSaving(false); }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const d of weekDates) {
        const dateStr = fmt(d);
        const records = groupChildren
          .filter(c => attendance[c.id]?.[dateStr])
          .map(c => ({ childId: c.id, status: attendance[c.id][dateStr] }));
        if (records.length > 0) {
          await api.post('/admin/attendance', { groupId: selectedGroup, date: dateStr, records });
        }
      }
      alert('Вся неделя сохранена!');
    } catch { alert('Ошибка сохранения'); }
    finally { setSaving(false); }
  };

  const prevWeek = () => {
    const d = new Date(currentWeekBase);
    d.setDate(d.getDate() - 7);
    setCurrentWeekBase(d);
  };

  const nextWeek = () => {
    const d = new Date(currentWeekBase);
    d.setDate(d.getDate() + 7);
    setCurrentWeekBase(d);
  };

  const thisWeek = () => setCurrentWeekBase(new Date());

  const today = fmt(new Date());

  return (
    <PageLayout title="Учёт посещаемости">
      {/* Controls */}
      <div className="bg-white border rounded-xl p-4 mb-4">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Группа</label>
            <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} className="w-full border rounded-lg px-3 py-2">
              <option value="" disabled>Выберите группу</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevWeek} className="px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">← Пред.</button>
            <button onClick={thisWeek} className="px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm font-medium">Сегодня</button>
            <button onClick={nextWeek} className="px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">След. →</button>
          </div>
          <button
            onClick={saveAll}
            disabled={saving || groupChildren.length === 0}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : '💾 Сохранить неделю'}
          </button>
        </div>
      </div>

      {/* Week days tabs */}
      <div className="flex gap-1 mb-4 bg-white border rounded-xl p-2 overflow-x-auto">
        <button
          onClick={() => setSelectedDay(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${selectedDay === null ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`}
        >
          Вся неделя
        </button>
        {weekDates.map((d, i) => {
          const dateStr = fmt(d);
          const isToday = dateStr === today;
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                selectedDay === i
                  ? 'bg-indigo-600 text-white'
                  : isToday
                  ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                  : isWeekend
                  ? 'text-gray-400 hover:bg-gray-50'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {DAY_NAMES[d.getDay()]} {d.getDate()}.{String(d.getMonth() + 1).padStart(2, '0')}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Загрузка...</div>
      ) : groupChildren.length === 0 ? (
        <div className="p-8 text-center text-gray-500 bg-white border rounded-xl">В этой группе нет активных детей</div>
      ) : selectedDay !== null ? (
        /* Single day view */
        (() => {
          const d = weekDates[selectedDay];
          const dateStr = fmt(d);
          return (
            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                <h3 className="font-medium text-gray-700">
                  {DAY_NAMES[d.getDay()]} {d.toLocaleDateString('ru', { day: 'numeric', month: 'long' })} ({groupChildren.length} детей)
                </h3>
                <div className="flex gap-2 text-sm">
                  <span className="text-gray-500 mr-1">Все:</span>
                  <button onClick={() => markAllDay(dateStr, 'present')} className="text-green-600 hover:underline">✅</button>
                  <button onClick={() => markAllDay(dateStr, 'absent')} className="text-red-500 hover:underline">❌</button>
                  <button onClick={() => saveDay(dateStr)} disabled={saving} className="ml-4 bg-indigo-600 text-white px-3 py-1 rounded text-xs hover:bg-indigo-700">
                    💾 Сохранить день
                  </button>
                </div>
              </div>
              <div className="divide-y">
                {groupChildren.map(child => {
                  const currentStatus = attendance[child.id]?.[dateStr] || '';
                  return (
                    <div key={child.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <span className="font-medium text-sm">{child.name}</span>
                      <div className="flex gap-2">
                        {STATUS_OPTS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setStatus(child.id, dateStr, opt.value)}
                            title={opt.title}
                            className={`w-10 h-10 rounded-lg text-lg transition-all ${
                              currentStatus === opt.value ? opt.color + ' ring-2 ring-offset-1' : 'bg-gray-100 hover:bg-gray-200 grayscale opacity-40 hover:opacity-70'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()
      ) : (
        /* Full week table view */
        <div className="bg-white border rounded-xl overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">Ребёнок</th>
                {weekDates.map((d, i) => {
                  const isToday = fmt(d) === today;
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <th key={i} className={`px-2 py-3 text-center text-xs font-medium uppercase min-w-[80px] ${isToday ? 'bg-indigo-50 text-indigo-700' : isWeekend ? 'text-gray-400' : 'text-gray-500'}`}>
                      <div>{DAY_NAMES[d.getDay()]}</div>
                      <div className="text-xs font-normal">{d.getDate()}.{String(d.getMonth() + 1).padStart(2, '0')}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y">
              {groupChildren.map(child => (
                <tr key={child.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-medium whitespace-nowrap sticky left-0 bg-white z-10">{child.name}</td>
                  {weekDates.map((d, i) => {
                    const dateStr = fmt(d);
                    const st = attendance[child.id]?.[dateStr] || '';
                    const opt = STATUS_OPTS.find(o => o.value === st);
                    return (
                      <td key={i} className="px-1 py-2 text-center">
                        <select
                          value={st}
                          onChange={e => setStatus(child.id, dateStr, e.target.value)}
                          className={`text-sm rounded px-1 py-1 border w-full text-center ${opt ? opt.color : 'text-gray-300'}`}
                        >
                          <option value="">—</option>
                          {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label} {o.title}</option>)}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  );
}
