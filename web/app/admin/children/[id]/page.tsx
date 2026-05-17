'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import ChildEditCard from '@/components/ChildEditCard';
import { Card, SectionLabel } from '@/components/ui';
import api from '@/lib/api';

interface AdminChild {
  id: string;
  name?: string;
  birthDate?: string;
  photo?: string | null;
  allergies?: string;
  extraServices?: string[];
  notes?: string;
  contacts?: { name: string; phone: string; relation: string }[];
  representatives?: { name: string; phone: string; relation: string }[];
  groupId?: string;
  group?: { id?: string; name?: string; teacher?: { name?: string } };
  parents?: { parent: { id: string; name: string; email?: string; phone?: string } }[];
  specialists?: { specialist: { id: string; name: string; role?: string } }[];
  attendance?: { id: string; date: string; status: string }[];
  status?: string;
}

export default function AdminChildDetail() {
  const { id } = useParams<{ id: string }>();
  const [child, setChild] = useState<AdminChild | null>(null);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    api.get(`/admin/children/${id}`).then(r => setChild(r.data));
    api.get('/admin/groups').then(r => setGroups(r.data)).catch(() => {});
  }, [id]);

  if (!child) {
    return (
      <PageLayout>
        <p className="p-8 text-center text-slate-400">Загрузка…</p>
      </PageLayout>
    );
  }

  const parents = (child.parents || []).map(link => link.parent).filter(Boolean);

  return (
    <PageLayout title={child.name} showBackButton>
      <ChildEditCard
        child={child}
        groups={groups}
        onUpdated={(c) => setChild(prev => ({ ...(prev || {}), ...(c as object) } as AdminChild))}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card padding="md">
          <SectionLabel>Родители</SectionLabel>
          {parents.length === 0 ? (
            <div className="text-sm text-slate-400 mt-2">Не привязаны</div>
          ) : (
            <ul className="mt-2 space-y-2">
              {parents.map(p => (
                <li key={p.id} className="text-sm">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-slate-500">
                    {[p.email, p.phone].filter(Boolean).join(' · ')}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="md">
          <SectionLabel>Специалисты</SectionLabel>
          {!child.specialists?.length ? (
            <div className="text-sm text-slate-400 mt-2">Не назначены</div>
          ) : (
            <ul className="mt-2 space-y-2">
              {child.specialists.map(link => (
                <li key={link.specialist.id} className="text-sm">
                  <div className="font-medium">{link.specialist.name}</div>
                  <div className="text-xs text-slate-500">{link.specialist.role}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card padding="md">
        <SectionLabel>Посещаемость · последние 14 дней</SectionLabel>
        {child.attendance?.length ? (
          <div className="flex gap-2 overflow-x-auto pb-2 mt-3">
            {child.attendance.map((record) => (
              <div
                key={record.id}
                className="flex flex-col items-center min-w-[64px] py-2 px-2 rounded-xl border border-slate-100 bg-slate-50/40"
              >
                <div className="text-[11px] text-slate-500 mb-1">
                  {new Date(record.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </div>
                <div
                  className={`text-xs font-medium ${
                    record.status === 'present'
                      ? 'text-emerald-700'
                      : record.status === 'absent'
                      ? 'text-slate-600'
                      : record.status === 'sick'
                      ? 'text-red-700'
                      : 'text-orange-700'
                  }`}
                >
                  {record.status === 'present'
                    ? 'Был(а)'
                    : record.status === 'absent'
                    ? 'Нет'
                    : record.status === 'sick'
                    ? 'Болеет'
                    : record.status === 'vacation'
                    ? 'Отпуск'
                    : '—'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-400 mt-2">Нет данных</div>
        )}
      </Card>
    </PageLayout>
  );
}
