'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { Schedule, DAY_NAMES } from '@/lib/types';

export default function ParentSchedule() {
  const [schedule, setSchedule] = useState<Schedule[]>([]);

  useEffect(() => {
    api.get('/children').then(r => {
      if (r.data[0]?.group?.id) {
        api.get(`/groups/${r.data[0].group.id}/schedule`).then(s => setSchedule(s.data));
      }
    });
  }, []);

  const byDay = DAY_NAMES.slice(1).map((_, i) => ({
    day: i + 1,
    label: DAY_NAMES[i + 1],
    items: schedule.filter(s => s.dayOfWeek === i + 1),
  }));

  return (
    <PageLayout title="Расписание">
      <div className="grid grid-cols-5 gap-3">
        {byDay.map(d => (
          <div key={d.day} className="bg-white border rounded-xl overflow-hidden">
            <div className="bg-indigo-50 text-indigo-700 font-medium text-center py-2 text-sm">{d.label}</div>
            <div className="p-2 space-y-1">
              {d.items.map(item => (
                <div key={item.id} className="text-xs p-1.5 bg-gray-50 rounded">
                  <div className="text-gray-400">{item.timeStart}–{item.timeEnd}</div>
                  <div>{item.activity}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
