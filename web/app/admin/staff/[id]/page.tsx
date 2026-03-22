'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import Link from 'next/link';
import { Role } from '@/lib/types';

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Администратор',
  teacher: 'Педагог',
  parent: 'Родитель',
  psychologist: 'Психолог',
  pediatrician: 'Педиатр',
};

export default function AdminStaffDetail() {
  const { id } = useParams<{ id: string }>();
  const [staff, setStaff] = useState<any>(null);

  useEffect(() => {
    api.get(`/admin/staff/${id}`).then(r => setStaff(r.data));
  }, [id]);

  if (!staff) return <PageLayout><p className="p-8 text-center text-gray-500">Загрузка...</p></PageLayout>;

  return (
    <PageLayout title={`Сотрудник: ${staff.name}`} showBackButton>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Краткая информация */}
        <div className="bg-white border rounded-xl p-6">
          <h3 className="text-lg font-medium mb-4">Профиль</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold uppercase">
              {staff.name.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-lg">{staff.name}</div>
              <div className="text-sm text-gray-500">{staff.email}</div>
              <div className="mt-1 inline-block px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-700 font-medium">
                {ROLE_LABELS[staff.role as Role] || staff.role}
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-500 border-t pt-4">
            <div>Дата регистрации: {new Date(staff.createdAt).toLocaleDateString('ru')}</div>
          </div>
        </div>

        {/* Назначения (Группы / Дети) */}
        <div className="bg-white border rounded-xl p-6">
          <h3 className="text-lg font-medium mb-4">Область ответственности</h3>
          
          {staff.role === 'teacher' && (
            <div>
              <div className="text-sm text-gray-500 mb-2">Закреплённая группа:</div>
              {staff.teacherGroup ? (
                <Link href={`/admin/groups/${staff.teacherGroup.id}`} className="block p-4 border rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors">
                  <div className="font-semibold text-indigo-900">{staff.teacherGroup.name}</div>
                  <div className="text-sm text-indigo-700 mt-1">
                    Возраст: {staff.teacherGroup.ageRange} лет · Год: {staff.teacherGroup.year}
                  </div>
                </Link>
              ) : (
                <p className="text-sm text-gray-400 p-4 border rounded-lg bg-gray-50 text-center">Группа не назначена</p>
              )}
            </div>
          )}

          {(staff.role === 'psychologist' || staff.role === 'pediatrician') && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm text-gray-500">Подопечные дети:</div>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{staff.specialistChildren?.length || 0}</span>
              </div>
              
              {staff.specialistChildren?.length === 0 ? (
                <p className="text-sm text-gray-400 p-4 border rounded-lg bg-gray-50 text-center">Нет назначенных детей</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {staff.specialistChildren.map((sc: any) => (
                    <Link key={sc.child.id} href={`/admin/children/${sc.child.id}`} className="block p-3 border rounded-lg bg-gray-50 hover:border-indigo-300 transition-colors">
                      <div className="font-medium text-sm text-gray-900">{sc.child.name}</div>
                      {sc.child.group && <div className="text-xs text-gray-500 mt-1">Группа: {sc.child.group.name}</div>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {staff.role === 'admin' && (
            <div className="text-center p-8 text-gray-400 border rounded-lg bg-gray-50 text-sm">
              У администратора есть доступ ко всем данным системы.
            </div>
          )}
        </div>

      </div>
    </PageLayout>
  );
}
