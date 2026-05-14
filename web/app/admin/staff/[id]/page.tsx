'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import { Card, Badge, SectionLabel } from '@/components/ui';
import api from '@/lib/api';
import { Role } from '@/lib/types';

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Администратор',
  teacher: 'Педагог',
  parent: 'Родитель',
  psychologist: 'Психолог',
  pediatrician: 'Педиатр',
};

interface StaffDetail {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  teacherGroup?: { id: string; name: string; ageRange: string; year: number } | null;
  specialistChildren?: {
    child: { id: string; name: string; group?: { name: string } };
  }[];
}

export default function AdminStaffDetail() {
  const { id } = useParams<{ id: string }>();
  const [staff, setStaff] = useState<StaffDetail | null>(null);

  useEffect(() => {
    api.get(`/admin/staff/${id}`).then(r => setStaff(r.data));
  }, [id]);

  if (!staff) {
    return (
      <PageLayout title="Загрузка…">
        <div className="text-sm text-slate-400 py-12 text-center">…</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout eyebrow="Профиль сотрудника" title={staff.name}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card padding="md">
          <SectionLabel>Профиль</SectionLabel>
          <div className="flex items-center gap-4 mt-4">
            <div className="h-16 w-16 rounded-full bg-brand-pale flex items-center justify-center font-serif text-2xl text-brand uppercase">
              {staff.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{staff.name}</div>
              <div className="text-sm text-slate-500 truncate">{staff.email}</div>
              <div className="mt-2">
                <Badge tone="brand">{ROLE_LABEL[staff.role] || staff.role}</Badge>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500 border-t border-slate-100 pt-3 mt-4">
            Дата регистрации:{' '}
            <span className="text-foreground">
              {new Date(staff.createdAt).toLocaleDateString('ru-RU')}
            </span>
          </div>
        </Card>

        <Card padding="md">
          <SectionLabel>Область ответственности</SectionLabel>

          {staff.role === 'teacher' && (
            <div className="mt-3">
              <div className="text-xs text-slate-500 mb-2">Закреплённая группа</div>
              {staff.teacherGroup ? (
                <Link
                  href={`/admin/groups/${staff.teacherGroup.id}`}
                  className="block p-4 rounded-xl bg-brand-pale/40 hover:bg-brand-pale/60 transition-colors"
                >
                  <div className="font-serif text-xl text-brand">{staff.teacherGroup.name}</div>
                  <div className="text-sm text-slate-600 mt-1">
                    {staff.teacherGroup.ageRange} лет · {staff.teacherGroup.year}
                  </div>
                </Link>
              ) : (
                <div className="text-sm text-slate-400 p-4 rounded-xl bg-slate-50 text-center">
                  Группа не назначена
                </div>
              )}
            </div>
          )}

          {(staff.role === 'psychologist' || staff.role === 'pediatrician') && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500">Подопечные дети</span>
                <Badge tone="neutral">{staff.specialistChildren?.length || 0}</Badge>
              </div>
              {staff.specialistChildren?.length === 0 ? (
                <div className="text-sm text-slate-400 p-4 rounded-xl bg-slate-50 text-center">
                  Нет назначенных детей
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {staff.specialistChildren?.map(sc => (
                    <Link
                      key={sc.child.id}
                      href={`/admin/children/${sc.child.id}`}
                      className="block p-3 rounded-xl border border-slate-100 hover:border-brand transition-colors"
                    >
                      <div className="font-medium text-sm">{sc.child.name}</div>
                      {sc.child.group && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          {sc.child.group.name}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {staff.role === 'admin' && (
            <div className="text-sm text-slate-400 p-6 rounded-xl bg-slate-50 text-center mt-3">
              У администратора есть доступ ко всем данным системы.
            </div>
          )}
        </Card>
      </div>
    </PageLayout>
  );
}
