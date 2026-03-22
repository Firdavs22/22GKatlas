'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import Link from 'next/link';

export default function AdminChildDetail() {
  const { id } = useParams<{ id: string }>();
  const [child, setChild] = useState<any>(null);

  useEffect(() => {
    api.get(`/admin/children/${id}`).then(r => setChild(r.data));
  }, [id]);

  if (!child) return <PageLayout><p className="p-8 text-center text-gray-500">Загрузка...</p></PageLayout>;

  return (
    <PageLayout title={child.name} showBackButton>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Краткая информация */}
        <div className="bg-white border rounded-xl p-6">
          <h3 className="text-lg font-medium mb-4">Профиль</h3>
          <div className="space-y-3 text-sm">
            <div><span className="text-gray-500">Статус:</span> {child.status === 'active' ? '🟢 Активен' : '⚪ Выбыл'}</div>
            <div><span className="text-gray-500">Дата рождения:</span> {new Date(child.birthDate).toLocaleDateString('ru')}</div>
            <div>
              <span className="text-gray-500">Группа:</span>{' '}
              {child.group ? (
                <Link href={`/admin/groups/${child.group.id}`} className="text-indigo-600 hover:underline">
                  {child.group.name}
                </Link>
              ) : 'Нет'}
            </div>
            {child.group?.teacher && (
              <div><span className="text-gray-500">Педагог:</span> {child.group.teacher.name}</div>
            )}
          </div>
        </div>

        {/* Родители */}
        <div className="bg-white border rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Родители</h3>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{child.parents.length}</span>
          </div>
          {child.parents.length === 0 ? (
            <p className="text-gray-400 text-sm">Не добавлены</p>
          ) : (
            <div className="space-y-3">
              {child.parents.map((p: any) => (
                <div key={p.parent.id} className="text-sm p-3 border rounded-lg bg-gray-50">
                  <div className="font-medium">{p.parent.name}</div>
                  <div className="text-gray-500">{p.parent.email}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Специалисты */}
        <div className="bg-white border rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Специалисты</h3>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{child.specialists.length}</span>
          </div>
          {child.specialists.length === 0 ? (
            <p className="text-gray-400 text-sm">Не назначены</p>
          ) : (
            <div className="space-y-3">
              {child.specialists.map((s: any) => (
                <div key={s.specialist.id} className="text-sm p-3 border rounded-lg bg-gray-50">
                  <div className="font-medium">{s.specialist.name}</div>
                  <div className="text-gray-500 capitalize">{s.specialist.role}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Посещаемость (последние 14 дней) */}
        <div className="lg:col-span-3 bg-white border rounded-xl p-6">
          <h3 className="text-lg font-medium mb-4">Посещаемость (последние дни)</h3>
          {child.attendance && child.attendance.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {child.attendance.map((a: any) => (
                <div key={a.id} className="flex flex-col items-center min-w-[60px] p-2 border rounded-lg bg-gray-50">
                  <div className="text-xs text-gray-500 mb-1">{new Date(a.date).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}</div>
                  <div className={`text-sm font-medium ${a.status === 'present' ? 'text-green-600' : a.status === 'absent' ? 'text-red-500' : 'text-gray-400'}`}>
                    {a.status === 'present' ? 'Был(а)' : a.status === 'absent' ? 'Не был(а)' : '—'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Нет данных о посещаемости</p>
          )}
        </div>

      </div>
    </PageLayout>
  );
}
