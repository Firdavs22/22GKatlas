'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Users } from 'lucide-react';
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

const inputCls =
  'w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

export default function TeacherChildren() {
  const [children, setChildren] = useState<Child[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/children').then(r => setChildren(r.data));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return children;
    return children.filter(c => c.name.toLowerCase().includes(q));
  }, [children, search]);

  const groupName = children[0]?.group?.name || '';

  return (
    <PageLayout
      eyebrow={groupName ? `Группа · ${groupName}` : undefined}
      title="Дети группы"
    >
      <Card padding="md" className="mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Имя ребёнка…"
            className={`${inputCls} pl-9`}
          />
        </div>
        <div className="mt-3 text-xs text-slate-500">
          {search
            ? `Найдено: ${filtered.length} из ${children.length}`
            : `Всего детей: ${children.length}`}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-12 text-center flex flex-col items-center gap-2">
            <Users size={32} className="text-slate-300" />
            {children.length === 0
              ? 'В группе пока нет детей. Их добавит администратор.'
              : 'Никого не найдено'}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <Link key={c.id} href={`/teacher/diary?childId=${c.id}`} className="group block">
              <Card padding="md" className="hover:border-brand transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-pale flex items-center justify-center font-serif text-brand shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs text-slate-500">
                      {calcAge(c.birthDate)} лет
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
