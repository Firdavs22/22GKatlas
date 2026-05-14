'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card } from '@/components/ui';
import api from '@/lib/api';
import { Child } from '@/lib/types';

function calcAge(birthDate: string): number {
  const today = new Date();
  const b = new Date(birthDate);
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}

export default function PediatricianChildren() {
  const [children, setChildren] = useState<Child[]>([]);
  useEffect(() => {
    api.get('/children').then(r => setChildren(r.data));
  }, []);

  return (
    <PageLayout
      eyebrow={`${children.length} ${children.length === 1 ? 'пациент' : children.length < 5 ? 'пациента' : 'пациентов'}`}
      title="Мои пациенты"
    >
      {children.length === 0 ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-12 text-center">
            Нет назначенных детей
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {children.map(c => (
            <Link key={c.id} href={`/pediatrician/children/${c.id}`} className="group">
              <Card padding="md" className="hover:border-brand transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-pale flex items-center justify-center font-serif text-brand shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs text-slate-500">
                      {c.group?.name || 'Без группы'} · {calcAge(c.birthDate)} лет ·{' '}
                      {new Date(c.birthDate).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                  <ArrowRight
                    size={18}
                    className="text-slate-300 group-hover:text-brand transition-colors"
                  />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
