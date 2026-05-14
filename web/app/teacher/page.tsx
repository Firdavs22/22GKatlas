'use client';
import { useEffect, useMemo, useState } from 'react';
import { Download, Filter, Save } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button } from '@/components/ui';
import ProgressStageDot, { STAGE_ORDER, STAGE_LABEL } from '@/components/ProgressStageDot';
import api from '@/lib/api';

type Stage = 'none' | 'presented' | 'practicing' | 'mastered';

interface Skill {
  id: string;
  title: string;
}
interface SkillGroup {
  id: string;
  title: string;
  skills?: Skill[];
}
interface Area {
  id: string;
  title: string;
  color?: string;
  groups?: SkillGroup[];
}
interface ChildLite {
  id: string;
  name: string;
}
interface GroupProgressResponse {
  children: ChildLite[];
  areas: Area[];
  progress: Record<string, Record<string, Stage>>;
  group?: { name?: string; ageRange?: string };
}

function nameInitial(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.charAt(0) || '?').toUpperCase();
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] || '';
  return `${parts[0]} ${parts[1].charAt(0)}.`;
}

function shortAreaLabel(title: string): string {
  return title.split(' ').map(w => w.slice(0, 8)).join(' ').toUpperCase();
}

export default function TeacherMatrix() {
  const [data, setData] = useState<GroupProgressResponse | null>(null);
  const [progress, setProgress] = useState<Record<string, Record<string, Stage>>>({});
  const [pending, setPending] = useState<Map<string, Stage>>(new Map());
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/children/group-progress').then(r => {
      setData(r.data);
      setProgress(r.data.progress);
    });
  }, []);

  const flatSkills = useMemo(() => {
    if (!data) return [] as { skill: Skill; area: Area }[];
    const out: { skill: Skill; area: Area }[] = [];
    for (const a of data.areas) {
      if (areaFilter !== 'all' && a.id !== areaFilter) continue;
      for (const g of a.groups || []) {
        for (const s of g.skills || []) {
          out.push({ skill: s, area: a });
        }
      }
    }
    return out;
  }, [data, areaFilter]);

  /** Cycle child × skill cell to the next stage; queue change for save. */
  const cycleCell = (childId: string, skillId: string) => {
    const current = progress[childId]?.[skillId] || 'none';
    const next = STAGE_ORDER[(STAGE_ORDER.indexOf(current) + 1) % STAGE_ORDER.length];
    setProgress(prev => ({
      ...prev,
      [childId]: { ...prev[childId], [skillId]: next },
    }));
    setPending(prev => {
      const map = new Map(prev);
      map.set(`${childId}:${skillId}`, next);
      return map;
    });
  };

  const handleSave = async () => {
    if (pending.size === 0) return;
    setSaving(true);
    try {
      const entries = Array.from(pending.entries());
      for (const [key, stage] of entries) {
        const [childId, skillId] = key.split(':');
        await api.put(`/children/${childId}/progress`, { skillId, stage });
      }
      setPending(new Map());
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <PageLayout title="Матрица прогресса" wide>
        <div className="text-sm text-slate-400 py-12 text-center">Загрузка…</div>
      </PageLayout>
    );
  }

  if (!data.children.length) {
    return (
      <PageLayout title="Матрица прогресса" wide>
        <Card padding="md">
          <div className="text-sm text-slate-400 py-12 text-center">
            Группа не назначена или в ней нет детей
          </div>
        </Card>
      </PageLayout>
    );
  }

  const groupName = data.group?.name || 'Группа';
  const ageRange = data.group?.ageRange || '';
  const childrenCount = data.children.length;

  return (
    <PageLayout
      eyebrow={`Группа ${groupName} · ${ageRange} · ${childrenCount} ${childrenCount === 1 ? 'ребёнок' : childrenCount < 5 ? 'ребёнка' : 'детей'}`}
      title="Матрица прогресса"
      wide
      actions={
        <>
          <div className="relative">
            <select
              value={areaFilter}
              onChange={e => setAreaFilter(e.target.value)}
              className="h-9 pl-9 pr-3 text-sm rounded-full border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 appearance-none cursor-pointer"
            >
              <option value="all">Все области</option>
              {data.areas.map(a => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
            <Filter
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
          <Button variant="outline" size="sm">
            <Download size={16} />
            Отчёт
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={pending.size === 0 || saving}
          >
            <Save size={16} />
            {saving ? 'Сохранение…' : pending.size > 0 ? `Сохранить (${pending.size})` : 'Сохранить'}
          </Button>
        </>
      }
    >
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-5 text-xs text-slate-600">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Легенда</span>
        {STAGE_ORDER.map(s => (
          <span key={s} className="inline-flex items-center gap-2">
            <ProgressStageDot stage={s} size={14} />
            {STAGE_LABEL[s]}
          </span>
        ))}
        <span className="ml-auto text-[11px] text-slate-400">
          Клик по ячейке: — → ЗН → ПВ → УС
        </span>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                <th
                  className="sticky left-0 z-20 bg-white border-b border-r border-slate-100 px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 min-w-[180px]"
                >
                  Ребёнок
                </th>
                {flatSkills.map(({ skill, area }) => (
                  <th
                    key={skill.id}
                    className="border-b border-r border-slate-100 align-bottom px-2 pt-4 pb-3 w-12"
                  >
                    <div
                      className="flex flex-col items-center gap-1 mx-auto"
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 150 }}
                    >
                      <span className="text-[9px] uppercase tracking-wider text-slate-400">
                        {shortAreaLabel(area.title)}
                      </span>
                      <span className="text-xs font-medium text-foreground">{skill.title}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.children.map(child => (
                <tr key={child.id} className="hover:bg-slate-50/40">
                  <td className="sticky left-0 z-10 bg-white border-r border-slate-100 px-5 py-3 min-w-[180px]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-brand-pale flex items-center justify-center font-serif text-xs text-brand shrink-0">
                        {nameInitial(child.name)}
                      </div>
                      <span className="font-medium text-sm truncate">{shortName(child.name)}</span>
                    </div>
                  </td>
                  {flatSkills.map(({ skill }) => {
                    const stage = (progress[child.id]?.[skill.id] || 'none') as Stage;
                    const key = `${child.id}:${skill.id}`;
                    const isPending = pending.has(key);
                    return (
                      <td
                        key={skill.id}
                        className={`border-r border-slate-100 text-center p-1 ${isPending ? 'bg-brand-pale/30' : ''}`}
                      >
                        <button
                          type="button"
                          onClick={() => cycleCell(child.id, skill.id)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100 transition-colors"
                          title={`${child.name} — ${skill.title}: ${STAGE_LABEL[stage]}`}
                        >
                          <ProgressStageDot stage={stage} size={20} />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageLayout>
  );
}
