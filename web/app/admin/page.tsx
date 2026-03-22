'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ children: 0, groups: 0, staff: 0 });
  useEffect(() => {
    Promise.all([
      api.get('/admin/children'),
      api.get('/admin/groups'),
      api.get('/admin/staff'),
    ]).then(([c, g, s]) => setStats({ children: c.data.length, groups: g.data.length, staff: s.data.length }));
  }, []);
  return (
    <PageLayout title="Дашборд">
      <div className="grid grid-cols-3 gap-6">
        {[
          { label: 'Детей', value: stats.children, href: '/admin/children', color: 'bg-blue-50 text-blue-700' },
          { label: 'Групп', value: stats.groups, href: '/admin/groups', color: 'bg-green-50 text-green-700' },
          { label: 'Сотрудников', value: stats.staff, href: '/admin/staff', color: 'bg-purple-50 text-purple-700' },
        ].map(s => (
          <Link key={s.label} href={s.href} className={`${s.color} p-6 rounded-2xl flex flex-col gap-2 hover:opacity-80`}>
            <span className="text-4xl font-bold">{s.value}</span>
            <span className="font-medium">{s.label}</span>
          </Link>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4">
        {[
          { label: 'Навыки', href: '/admin/skills', desc: 'Управление деревом навыков' },
          { label: 'Расписание', href: '/admin/schedule', desc: 'Режим дня групп' },
        ].map(l => (
          <Link key={l.label} href={l.href} className="bg-white border rounded-xl p-4 hover:border-indigo-300">
            <div className="font-medium">{l.label}</div>
            <div className="text-sm text-gray-500">{l.desc}</div>
          </Link>
        ))}
      </div>
    </PageLayout>
  );
}
