'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { STAGE_LABELS, STAGE_COLORS } from '@/lib/types';

type Stage = 'none' | 'presented' | 'practicing' | 'mastered';
const STAGES: Stage[] = ['none', 'presented', 'practicing', 'mastered'];

export default function TeacherMatrix() {
  const [data, setData] = useState<any>(null);
  const [progress, setProgress] = useState<Record<string, Record<string, Stage>>>({});
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    api.get('/children/group-progress').then(r => {
      setData(r.data);
      setProgress(r.data.progress);
      // Expand all areas by default
      const areaIds = r.data.areas.map((a: any) => a.id);
      setExpandedAreas(new Set(areaIds));
    });
  }, []);

  const updateStage = async (childId: string, skillId: string, current: Stage) => {
    const next = STAGES[(STAGES.indexOf(current) + 1) % STAGES.length];
    const key = `${childId}-${skillId}`;
    setSaving(key);
    setProgress(prev => ({
      ...prev,
      [childId]: { ...prev[childId], [skillId]: next },
    }));
    try {
      await api.put(`/children/${childId}/progress`, { skillId, stage: next });
    } catch {
      // Revert on error
      setProgress(prev => ({
        ...prev,
        [childId]: { ...prev[childId], [skillId]: current },
      }));
    } finally {
      setSaving(null);
    }
  };

  if (!data) return <PageLayout title="Матрица прогресса"><p className="text-gray-400 p-4">Загрузка...</p></PageLayout>;
  if (!data.children.length) return <PageLayout title="Матрица прогресса"><p className="text-gray-400 p-4">Группа не назначена или детей нет</p></PageLayout>;

  const toggleArea = (areaId: string) => {
    setExpandedAreas(prev => {
      const next = new Set(prev);
      next.has(areaId) ? next.delete(areaId) : next.add(areaId);
      return next;
    });
  };

  return (
    <PageLayout title="Матрица прогресса">
      {/* Legend */}
      <div className="flex gap-3 mb-4 text-xs text-gray-500 flex-wrap">
        {STAGES.map(s => (
          <span key={s} className={`px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[s]}`}>
            {STAGE_LABELS[s]} — {s === 'none' ? 'Не начат' : s === 'presented' ? 'Знакомство' : s === 'practicing' ? 'Повторение' : 'Усвоено'}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto border rounded-xl bg-white">
        <table className="border-collapse text-sm" style={{ minWidth: `${200 + data.children.length * 76}px` }}>
          {/* Header — child names */}
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-white border-b border-r border-gray-200 px-3 py-2 text-left font-medium text-gray-500 min-w-[200px]">
                Навык
              </th>
              {data.children.map((child: any) => (
                <th key={child.id} className="border-b border-r border-gray-200 px-2 py-2 text-center font-medium text-gray-700 min-w-[72px]">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                      {child.name.charAt(0)}
                    </div>
                    <span className="text-[10px] leading-tight">{child.name.split(' ')[0]}</span>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const res = await api.get(`/children/${child.id}/report`, { responseType: 'blob' });
                        const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                        const a = document.createElement('a'); a.href = url; a.download = `отчёт-${child.name}.pdf`; a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="text-[9px] text-blue-500 hover:text-blue-700 hover:underline"
                      title="Скачать PDF отчёт"
                    >
                      📄 PDF
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.areas.map((area: any) => (
              <>
                {/* Area header row — clickable to toggle */}
                <tr
                  key={`area-${area.id}`}
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => toggleArea(area.id)}
                >
                  <td
                    colSpan={data.children.length + 1}
                    className="sticky left-0 z-10 px-3 py-2 font-semibold text-sm border-b border-gray-200"
                    style={{ backgroundColor: area.color + '22', color: area.color }}
                  >
                    {expandedAreas.has(area.id) ? '▾' : '▸'} {area.icon} {area.title}
                  </td>
                </tr>

                {expandedAreas.has(area.id) && area.groups?.map((group: any) => (
                  <>
                    {/* Skill group header */}
                    <tr key={`sg-${group.id}`}>
                      <td
                        colSpan={data.children.length + 1}
                        className="sticky left-0 z-10 px-4 py-1 text-xs font-medium text-gray-400 bg-gray-50 border-b border-gray-200"
                      >
                        {group.title}
                      </td>
                    </tr>

                    {/* Individual skills */}
                    {group.skills?.map((skill: any) => (
                      <tr key={skill.id} className="hover:bg-gray-50">
                        <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 px-3 py-1.5 text-gray-700 min-w-[200px] max-w-[200px]">
                          <span className="line-clamp-2 text-xs">{skill.title}</span>
                        </td>
                        {data.children.map((child: any) => {
                          const stage = (progress[child.id]?.[skill.id] || 'none') as Stage;
                          const key = `${child.id}-${skill.id}`;
                          return (
                            <td key={child.id} className="border-b border-r border-gray-200 text-center p-1">
                              <button
                                onClick={() => updateStage(child.id, skill.id, stage)}
                                disabled={saving === key}
                                className={`text-xs font-medium px-1.5 py-0.5 rounded-full w-full transition-all ${STAGE_COLORS[stage]} ${saving === key ? 'opacity-50' : 'hover:scale-110'}`}
                                title={`${child.name} — ${skill.title}: кликни для следующей стадии`}
                              >
                                {STAGE_LABELS[stage]}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </PageLayout>
  );
}
