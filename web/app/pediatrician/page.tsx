'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';
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

export default function PediatricianChildren() {
  const [children, setChildren] = useState<Child[]>([]);
  const [groupFilter, setGroupFilter] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/children').then(r => setChildren(r.data));
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const c of children) {
      const g = c.group;
      if (!g?.id) continue;
      const cur = map.get(g.id);
      if (cur) cur.count++;
      else map.set(g.id, { id: g.id, name: g.name || '—', count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [children]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return children.filter(c => {
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (groupFilter.size > 0) {
        if (!c.group?.id || !groupFilter.has(c.group.id)) return false;
      }
      return true;
    });
  }, [children, search, groupFilter]);

  const toggleGroup = (id: string) => {
    setGroupFilter(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <PageLayout
      eyebrow={
        groupFilter.size > 0 || search
          ? `Найдено: ${filtered.length} из ${children.length}`
          : `${children.length} ${children.length === 1 ? 'пациент' : children.length < 5 ? 'пациента' : 'пациентов'}`
      }
      title="Мои пациенты"
    >
      <Card padding="md" className="mb-4">
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Имя ребёнка…"
            className={`${inputCls} pl-9`}
          />
        </div>
        {groups.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mr-1">
              Группы
            </span>
            <button
              type="button"
              onClick={() => setGroupFilter(new Set())}
              className={`px-3 h-7 text-xs rounded-full transition-colors ${
                groupFilter.size === 0
                  ? 'bg-brand text-white'
                  : 'border border-slate-200 text-slate-600 hover:border-brand'
              }`}
            >
              Все
            </button>
            {groups.map(g => {
              const active = groupFilter.has(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGroup(g.id)}
                  className={`px-3 h-7 text-xs rounded-full transition-colors ${
                    active
                      ? 'bg-brand text-white'
                      : 'border border-slate-200 text-slate-600 hover:border-brand'
                  }`}
                >
                  {g.name}{' '}
                  <span className={`ml-1 ${active ? 'text-white/80' : 'text-slate-400'}`}>{g.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {filtered.length === 0 ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-12 text-center">
            {children.length === 0 ? 'Нет назначенных детей' : 'Никого не найдено'}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
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
