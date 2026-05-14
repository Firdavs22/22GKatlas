'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Save, ChevronDown, ChevronRight } from 'lucide-react';
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

const STAGE_HINT: Record<Stage, string> = {
  none: 'Не начат',
  presented: 'Знакомство — была презентация',
  practicing: 'Повторение — работает самостоятельно',
  mastered: 'Усвоено — уверенно проявляет навык',
};

function nameInitial(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.charAt(0) || '?').toUpperCase();
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] || '';
  return `${parts[0]} ${parts[1].charAt(0)}.`;
}

export default function TeacherMatrix() {
  const [data, setData] = useState<GroupProgressResponse | null>(null);
  const [progress, setProgress] = useState<Record<string, Record<string, Stage>>>({});
  const [pending, setPending] = useState<Map<string, Stage>>(new Map());
  const [saving, setSaving] = useState(false);

  const [collapsedAreas, setCollapsedAreas] = useState<Set<string>>(new Set());
  const [openCell, setOpenCell] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/children/group-progress').then(r => {
      setData(r.data);
      setProgress(r.data.progress);
    });
  }, []);

  // Close popover on outside click
  useEffect(() => {
    if (!openCell) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenCell(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openCell]);

  const toggleArea = (areaId: string) => {
    setCollapsedAreas(prev => {
      const next = new Set(prev);
      if (next.has(areaId)) next.delete(areaId);
      else next.add(areaId);
      return next;
    });
  };

  const setStage = (childId: string, skillId: string, stage: Stage) => {
    setProgress(prev => ({
      ...prev,
      [childId]: { ...prev[childId], [skillId]: stage },
    }));
    setPending(prev => {
      const map = new Map(prev);
      map.set(`${childId}:${skillId}`, stage);
      return map;
    });
    setOpenCell(null);
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

  /** Per-area metadata: skill list (when expanded) and counts. */
  const areaColumns = useMemo(() => {
    if (!data) return [] as { area: Area; collapsed: boolean; skills: Skill[]; skillCount: number }[];
    return data.areas.map(area => {
      const skills: Skill[] = [];
      for (const g of area.groups || []) {
        for (const s of g.skills || []) skills.push(s);
      }
      return {
        area,
        collapsed: collapsedAreas.has(area.id),
        skills,
        skillCount: skills.length,
      };
    });
  }, [data, collapsedAreas]);

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
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCollapsedAreas(prev =>
                prev.size === data.areas.length ? new Set() : new Set(data.areas.map(a => a.id)),
              )
            }
          >
            {collapsedAreas.size === data.areas.length ? 'Развернуть всё' : 'Свернуть всё'}
          </Button>
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
          Клик по зоне — свернуть · Клик по ячейке — выбрать стадию
        </span>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="border-collapse text-sm">
            <thead>
              {/* Row 1: areas (with colspan) */}
              <tr>
                <th
                  rowSpan={2}
                  className="sticky left-0 z-20 bg-white border-b border-r border-slate-100 px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 min-w-[180px] align-bottom"
                >
                  Ребёнок
                </th>
                {areaColumns.map(({ area, collapsed, skillCount }) => (
                  <th
                    key={area.id}
                    colSpan={collapsed ? 1 : skillCount || 1}
                    rowSpan={collapsed ? 2 : 1}
                    className={`border-b border-r border-slate-100 text-left align-middle ${
                      collapsed ? 'p-0 min-w-[140px]' : 'px-3 py-2 bg-slate-50/40'
                    }`}
                    style={collapsed ? { backgroundColor: `${area.color || '#0F5192'}10` } : {}}
                  >
                    <button
                      type="button"
                      onClick={() => toggleArea(area.id)}
                      className={`group flex items-center gap-1.5 w-full hover:opacity-80 transition-opacity ${
                        collapsed ? 'px-3 py-3 justify-start' : ''
                      }`}
                      style={{ color: area.color || undefined }}
                    >
                      {collapsed ? (
                        <ChevronRight size={14} className="opacity-60" />
                      ) : (
                        <ChevronDown size={14} className="opacity-60" />
                      )}
                      <span
                        className={`text-[11px] font-medium uppercase tracking-wider ${
                          collapsed ? 'truncate' : ''
                        }`}
                      >
                        {area.title}
                      </span>
                      {!collapsed && skillCount > 0 && (
                        <span className="text-[10px] text-slate-400 ml-1">{skillCount}</span>
                      )}
                    </button>
                  </th>
                ))}
              </tr>
              {/* Row 2: skill names (only for expanded areas) */}
              <tr>
                {areaColumns.flatMap(({ area, collapsed, skills }) =>
                  collapsed
                    ? []
                    : skills.map(skill => (
                        <th
                          key={skill.id}
                          className="border-b border-r border-slate-100 align-bottom px-2 pt-4 pb-3 w-12"
                          style={{ backgroundColor: `${area.color || '#0F5192'}08` }}
                        >
                          <div
                            className="flex items-center justify-center mx-auto"
                            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 130 }}
                          >
                            <span className="text-xs font-medium text-foreground">{skill.title}</span>
                          </div>
                        </th>
                      )),
                )}
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
                  {areaColumns.flatMap(({ area, collapsed, skills }) => {
                    if (collapsed) {
                      // Compute progress summary across the area for this child
                      let mastered = 0, started = 0;
                      for (const s of skills) {
                        const st = progress[child.id]?.[s.id];
                        if (st === 'mastered') mastered++;
                        else if (st && st !== 'none') started++;
                      }
                      return [(
                        <td
                          key={area.id}
                          className="border-r border-slate-100 text-center px-3 py-3 text-xs text-slate-500"
                          style={{ backgroundColor: `${area.color || '#0F5192'}06` }}
                        >
                          <span className="text-foreground font-medium">{mastered}</span>
                          <span className="text-slate-400">/{skills.length}</span>
                          {started > 0 && (
                            <span className="text-slate-400 ml-1">+{started}</span>
                          )}
                        </td>
                      )];
                    }
                    return skills.map(skill => {
                      const stage = (progress[child.id]?.[skill.id] || 'none') as Stage;
                      const cellKey = `${child.id}:${skill.id}`;
                      const isPending = pending.has(cellKey);
                      const isOpen = openCell === cellKey;
                      return (
                        <td
                          key={skill.id}
                          className={`relative border-r border-slate-100 text-center p-1 ${isPending ? 'bg-brand-pale/30' : ''}`}
                        >
                          <button
                            type="button"
                            onClick={() => setOpenCell(isOpen ? null : cellKey)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100 transition-colors"
                            title={`${child.name} — ${skill.title}: ${STAGE_LABEL[stage]}`}
                          >
                            <ProgressStageDot stage={stage} size={20} />
                          </button>
                          {isOpen && (
                            <div
                              ref={popoverRef}
                              className="absolute z-30 top-full left-1/2 -translate-x-1/2 mt-1 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2"
                            >
                              <div className="text-[10px] uppercase tracking-wider text-slate-400 px-2 pt-1 pb-1.5 truncate">
                                {skill.title}
                              </div>
                              <div className="flex flex-col">
                                {STAGE_ORDER.map(s => {
                                  const active = s === stage;
                                  return (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={() => setStage(child.id, skill.id, s)}
                                      className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-left text-sm transition-colors ${
                                        active ? 'bg-brand-pale/60' : 'hover:bg-slate-50'
                                      }`}
                                    >
                                      <ProgressStageDot stage={s} size={18} />
                                      <span className="flex-1">
                                        <span className="block font-medium text-sm">{STAGE_LABEL[s]}</span>
                                        <span className="block text-[11px] text-slate-500 leading-tight">
                                          {STAGE_HINT[s]}
                                        </span>
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    });
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
