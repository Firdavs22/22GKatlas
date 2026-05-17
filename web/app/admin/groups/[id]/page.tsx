'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import { Card, Badge, SectionLabel } from '@/components/ui';
import api from '@/lib/api';
import { DAY_NAMES } from '@/lib/types';

interface GroupDetail {
  id: string;
  name: string;
  ageRange: string;
  year: number;
  teacher?: { id: string; name: string; email: string };
  children?: {
    id: string;
    name: string;
    birthDate: string;
    status: string;
  }[];
  schedules?: {
    id: string;
    dayOfWeek: number;
    timeStart: string;
    timeEnd: string;
    activity: string;
  }[];
}

function calcAge(birthDate: string): number {
  const today = new Date();
  const b = new Date(birthDate);
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}

export default function AdminGroupDetail() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<GroupDetail | null>(null);

  useEffect(() => {
    api.get(`/admin/groups/${id}`).then(r => setGroup(r.data));
  }, [id]);

  if (!group) {
    return (
      <PageLayout title="Загрузка…">
        <div className="text-sm text-slate-400 py-12 text-center">…</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      eyebrow={`Группа · ${group.ageRange} лет · ${group.year}`}
      title={group.name}
      wide
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card padding="md">
          <SectionLabel>Информация</SectionLabel>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Возраст</dt>
              <dd>{group.ageRange} лет</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Год</dt>
              <dd>{group.year}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Учеников</dt>
              <dd>{group.children?.length || 0}</dd>
            </div>
          </dl>
          {group.teacher && (
            <div className="mt-4 p-3 rounded-xl bg-brand-pale/50">
              <div className="text-[11px] font-medium uppercase tracking-wider text-brand mb-1">
                Основной педагог
              </div>
              <div className="font-medium text-sm">{group.teacher.name}</div>
              <div className="text-xs text-slate-600 mt-0.5">{group.teacher.email}</div>
            </div>
          )}
        </Card>

        <Card padding="md" className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Список детей</SectionLabel>
            <Badge tone="neutral">{group.children?.length || 0}</Badge>
          </div>
          {!group.children?.length ? (
            <div className="text-sm text-slate-400 py-6 text-center">
              В группе пока нет детей
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.children.map(c => (
                <Link
                  key={c.id}
                  href={`/admin/children/${c.id}`}
                  className="block p-3 rounded-xl border border-slate-100 hover:border-brand transition-colors"
                >
                  <div className="font-medium text-sm">{c.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>{calcAge(c.birthDate)} лет</span>
                    <span>·</span>
                    {c.status === 'active' ? (
                      <Badge tone="success" dot>активен</Badge>
                    ) : (
                      <Badge tone="neutral">{c.status}</Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card padding="md">
        <SectionLabel>Расписание</SectionLabel>
        {group.schedules && group.schedules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-3">
            {[1, 2, 3, 4, 5].map(day => {
              const daySchedules = group.schedules!.filter(s => s.dayOfWeek === day);
              return (
                <div key={day} className="rounded-2xl border border-slate-100 bg-slate-50/30 overflow-hidden">
                  <div className="px-3 py-2 border-b border-slate-100 bg-brand-pale/30 text-center">
                    <span className="font-serif text-base text-brand">{DAY_NAMES[day]}</span>
                  </div>
                  <div className="p-2 space-y-2 min-h-[100px]">
                    {daySchedules.length === 0 ? (
                      <div className="text-xs text-slate-400 text-center py-3">—</div>
                    ) : (
                      daySchedules.map(s => (
                        <div
                          key={s.id}
                          className="text-xs p-2 rounded-lg bg-white border border-slate-100"
                        >
                          <div className="tabular-nums text-[11px] text-brand mb-0.5">
                            {s.timeStart} – {s.timeEnd}
                          </div>
                          <div className="text-sm text-foreground">{s.activity}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-slate-400 py-6 text-center">
            Расписание не установлено
          </div>
        )}
      </Card>
    </PageLayout>
  );
}
