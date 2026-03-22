'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { Child } from '@/lib/types';
import Link from 'next/link';

export default function PediatricianChildren() {
  const [children, setChildren] = useState<Child[]>([]);
  useEffect(() => { api.get('/children').then(r => setChildren(r.data)); }, []);
  return (
    <PageLayout title="Мои пациенты">
      <div className="space-y-2">
        {children.length === 0 && <p className="text-gray-400 text-center py-8">Нет назначенных детей</p>}
        {children.map(c => (
          <Link key={c.id} href={`/pediatrician/children/${c.id}`} className="block bg-white border rounded-xl p-4 hover:border-indigo-300">
            <div className="font-medium">{c.name}</div>
            <div className="text-sm text-gray-500">{c.group?.name || 'Без группы'} · {new Date(c.birthDate).toLocaleDateString('ru')}</div>
          </Link>
        ))}
      </div>
    </PageLayout>
  );
}
