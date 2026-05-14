'use client';
import { useEffect, useMemo, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import { Card, SectionLabel } from '@/components/ui';
import api from '@/lib/api';

type Stage = 'none' | 'presented' | 'practicing' | 'mastered';

interface Skill { id: string; title: string; }
interface SkillGroup { id: string; title: string; skills?: Skill[]; }
interface Area { id: string; title: string; color?: string; groups?: SkillGroup[]; }
interface ChildLite { id: string; name: string; }
interface GroupProgress {
  children: ChildLite[];
  areas: Area[];
  progress: Record<string, Record<string, Stage>>;
  group?: { name?: string; ageRange?: string };
}

type Period = 'week' | 'month' | 'year';

const PERIOD_LABEL: Record<Period, string> = {
  week: 'Неделя',
  month: 'Месяц',
  year: 'Год',
};

/** 5-step color scale, ordered low→high. */
const SCALE = [
  { min: 0, max: 15, bg: 'bg-slate-100', text: 'text-slate-500' },
  { min: 15, max: 35, bg: 'bg-warn/50', text: 'text-orange-900' },
  { min: 35, max: 60, bg: 'bg-brand-pale', text: 'text-brand' },
  { min: 60, max: 80, bg: 'bg-success/40', text: 'text-emerald-900' },
  { min: 80, max: 101, bg: 'bg-success', text: 'text-white' },
];

function bucketFor(pct: number) {
  return SCALE.find(b => pct >= b.min && pct < b.max) || SCALE[0];
}

function stageValue(s?: Stage): number {
  if (s === 'mastered') return 100;
  if (s === 'practicing') return 60;
  if (s === 'presented') return 25;
  return 0;
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] || '';
  return `${parts[0]} ${parts[1].charAt(0)}.`;
}

export default function HeatmapPage() {
  const [data, setData] = useState<GroupProgress | null>(null);
  const [period, setPeriod] = useState<Period>('month');

  useEffect(() => {
    api.get('/children/group-progress').then(r => setData(r.data));
  }, []);

  /** For each child × area, percentage based on weighted stage values. */
  const matrix = useMemo(() => {
    if (!data) return [] as { child: ChildLite; cells: { area: Area; pct: number }[] }[];
    return data.children.map(child => {
      const cells = data.areas.map(area => {
        let total = 0, sum = 0;
        for (const g of area.groups || []) {
          for (const s of g.skills || []) {
            total++;
            sum += stageValue(data.progress[child.id]?.[s.id]);
          }
        }
        return { area, pct: total ? Math.round(sum / total) : 0 };
      });
      return { child, cells };
    });
  }, [data]);

  /** Group averages per area. */
  const areaAverages = useMemo(() => {
    if (!data || matrix.length === 0) return [] as { area: Area; pct: number }[];
    return data.areas.map((area, i) => {
      const sum = matrix.reduce((acc, row) => acc + (row.cells[i]?.pct || 0), 0);
      return { area, pct: matrix.length ? Math.round(sum / matrix.length) : 0 };
    });
  }, [data, matrix]);

  if (!data) {
    return (
      <PageLayout title="Тепловая карта" wide>
        <div className="text-sm text-slate-400 py-12 text-center">Загрузка…</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      eyebrow={`Группа ${data.group?.name || ''}${data.group?.ageRange ? ` · ${data.group.ageRange}` : ''}`}
      title="Тепловая карта"
      wide
      actions={
        <div className="inline-flex rounded-full bg-slate-100 p-0.5">
          {(['week', 'month', 'year'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-1 text-xs rounded-full transition-colors ${
                period === p ? 'bg-white shadow-sm text-foreground font-medium' : 'text-slate-500'
              }`}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Heatmap table */}
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/40">
                  <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-5 py-3 min-w-[160px]">
                    Ребёнок
                  </th>
                  {data.areas.map(a => (
                    <th
                      key={a.id}
                      className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-5 py-3"
                    >
                      {a.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrix.map(row => (
                  <tr key={row.child.id}>
                    <td className="px-5 py-3 font-medium text-sm">{shortName(row.child.name)}</td>
                    {row.cells.map(({ area, pct }) => {
                      const b = bucketFor(pct);
                      return (
                        <td key={area.id} className="px-5 py-3">
                          <span
                            className={`inline-flex items-center justify-center min-w-[52px] h-9 px-3 rounded-xl text-sm font-mono ${b.bg} ${b.text}`}
                          >
                            {pct}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Side panel */}
        <div className="space-y-4">
          <Card padding="md">
            <SectionLabel>Шкала</SectionLabel>
            <ul className="space-y-2 mt-3 text-sm">
              {SCALE.map((b, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className={`w-8 h-5 rounded ${b.bg}`} />
                  <span className="text-slate-600">
                    {b.min}–{b.max === 101 ? 100 : b.max} %
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card padding="md">
            <SectionLabel>Средние по группе</SectionLabel>
            <ul className="space-y-3 mt-3">
              {areaAverages.map(({ area, pct }) => (
                <li key={area.id}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm">{area.title}</span>
                    <span className="font-serif text-sm">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
