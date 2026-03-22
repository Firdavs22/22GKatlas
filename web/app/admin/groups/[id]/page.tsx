'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import Link from 'next/link';
import { DAY_NAMES } from '@/lib/types';

export default function AdminGroupDetail() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<any>(null);

  useEffect(() => {
    api.get(`/admin/groups/${id}`).then(r => setGroup(r.data));
  }, [id]);

  if (!group) return <PageLayout><p className="p-8 text-center text-gray-500">Загрузка...</p></PageLayout>;

  return (
    <PageLayout title={`Группа: ${group.name}`} showBackButton>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Краткая информация */}
        <div className="bg-white border rounded-xl p-6">
          <h3 className="text-lg font-medium mb-4">Информация</h3>
          <div className="space-y-3 text-sm">
            <div><span className="text-gray-500">Название:</span> {group.name}</div>
            <div><span className="text-gray-500">Возраст:</span> {group.ageRange} лет</div>
            <div><span className="text-gray-500">Год:</span> {group.year}</div>
            <div><span className="text-gray-500">Учеников:</span> {group.children?.length || 0}</div>
            {group.teacher && (
              <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                <div className="text-xs text-indigo-400 mb-1 uppercase font-semibold">Основной педагог</div>
                <div className="font-medium text-indigo-900">{group.teacher.name}</div>
                <div className="text-sm text-indigo-600">{group.teacher.email}</div>
              </div>
            )}
          </div>
        </div>

        {/* Список детей */}
        <div className="bg-white border rounded-xl p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Список детей</h3>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{group.children?.length || 0}</span>
          </div>
          {group.children?.length === 0 ? (
            <p className="text-gray-400 text-sm">В группе пока нет детей</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.children.map((c: any) => (
                <Link key={c.id} href={`/admin/children/${c.id}`} className="block p-3 border rounded-lg bg-gray-50 hover:border-indigo-300 transition-colors">
                  <div className="font-medium text-sm text-gray-900">{c.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(c.birthDate).toLocaleDateString('ru')} · {c.status === 'active' ? '🟢 Активен' : '⚪'}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Расписание */}
        <div className="lg:col-span-3 bg-white border rounded-xl p-6">
          <h3 className="text-lg font-medium mb-4">Расписание</h3>
          {group.schedules && group.schedules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map(day => {
                const daySchedules = group.schedules.filter((s: any) => s.dayOfWeek === day);
                return (
                  <div key={day} className="border rounded-lg p-3 bg-gray-50">
                    <div className="font-medium text-center mb-3 text-gray-700 border-b pb-2">{DAY_NAMES[day]}</div>
                    {daySchedules.length === 0 ? (
                      <div className="text-xs text-center text-gray-400 py-4">Нет занятий</div>
                    ) : (
                      <div className="space-y-2">
                        {daySchedules.map((s: any) => (
                          <div key={s.id} className="text-xs p-2 bg-white rounded border border-gray-100">
                            <div className="font-semibold text-indigo-600">{s.timeStart} – {s.timeEnd}</div>
                            <div className="mt-0.5 text-gray-800">{s.activity}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Расписание не установлено</p>
          )}
        </div>

      </div>
    </PageLayout>
  );
}
