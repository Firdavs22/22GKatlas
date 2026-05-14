'use client';
import { useEffect, useMemo, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import { Card } from '@/components/ui';
import api from '@/lib/api';
import { Schedule, Child } from '@/lib/types';

const DAYS = [
  { idx: 1, full: 'Понедельник' },
  { idx: 2, full: 'Вторник' },
  { idx: 3, full: 'Среда' },
  { idx: 4, full: 'Четверг' },
  { idx: 5, full: 'Пятница' },
];

export default function TeacherSchedule() {
  const [group, setGroup] = useState<Child['group'] | null>(null);
  const [schedule, setSchedule] = useState<Schedule[]>([]);

  useEffect(() => {
    api.get('/children').then(r => {
      const first = r.data[0];
      setGroup(first?.group || null);
      const groupId = first?.group?.id || first?.groupId;
      if (groupId) api.get(`/groups/${groupId}/schedule`).then(s => setSchedule(s.data));
    });
  }, []);

  const timeSlots = useMemo(() => {
    const set = new Set<string>();
    schedule.forEach(s => set.add(s.timeStart));
    return Array.from(set).sort();
  }, [schedule]);

  const byTimeAndDay = useMemo(() => {
    const map = new Map<string, Map<number, Schedule>>();
    for (const item of schedule) {
      if (!map.has(item.timeStart)) map.set(item.timeStart, new Map());
      map.get(item.timeStart)!.set(item.dayOfWeek, item);
    }
    return map;
  }, [schedule]);

  return (
    <PageLayout
      eyebrow={group?.name ? `Неделя · группа «${group.name}»` : 'Расписание недели'}
      title="Расписание"
      wide
    >
      {timeSlots.length === 0 ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-12 text-center">
            Расписание пока не задано
          </div>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-5 py-3 w-24">
                    Время
                  </th>
                  {DAYS.map(d => (
                    <th
                      key={d.idx}
                      className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-5 py-3"
                    >
                      {d.full}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {timeSlots.map(t => (
                  <tr key={t}>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500 align-top">{t}</td>
                    {DAYS.map(d => {
                      const item = byTimeAndDay.get(t)?.get(d.idx);
                      return (
                        <td key={d.idx} className="px-5 py-4 align-top">
                          {item ? (
                            <>
                              <div className="text-sm font-medium text-foreground">{item.activity}</div>
                              {item.description && (
                                <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
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
