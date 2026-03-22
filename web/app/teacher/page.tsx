'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { Child, Area, Progress, STAGE_LABELS, STAGE_COLORS } from '@/lib/types';

type Stage = 'none' | 'presented' | 'practicing' | 'mastered';
const STAGES: Stage[] = ['none', 'presented', 'practicing', 'mastered'];

export default function TeacherMatrix() {
  const [children, setChildren] = useState<Child[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [progress, setProgress] = useState<Record<string, Record<string, Stage>>>({});
  const [selectedChild, setSelectedChild] = useState<string>('');

  useEffect(() => {
    api.get('/children').then(r => { setChildren(r.data); if (r.data[0]) setSelectedChild(r.data[0].id); });
    api.get('/admin/areas').then(r => setAreas(r.data));
  }, []);

  useEffect(() => {
    if (!selectedChild) return;
    api.get(`/children/${selectedChild}/progress`).then(r => {
      const map: Record<string, Stage> = {};
      r.data.forEach((p: Progress) => { map[p.skillId] = p.stage as Stage; });
      setProgress(prev => ({ ...prev, [selectedChild]: map }));
    });
  }, [selectedChild]);

  const updateStage = async (skillId: string, currentStage: Stage) => {
    const nextIdx = (STAGES.indexOf(currentStage) + 1) % STAGES.length;
    const nextStage = STAGES[nextIdx];
    await api.put(`/children/${selectedChild}/progress`, { skillId, stage: nextStage });
    setProgress(prev => ({
      ...prev,
      [selectedChild]: { ...prev[selectedChild], [skillId]: nextStage },
    }));
  };

  const childProgress = progress[selectedChild] || {};

  return (
    <PageLayout title="Матрица прогресса">
      <div className="mb-4">
        <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)} className="border rounded-lg px-3 py-2">
          {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="space-y-4">
        {areas.map(area => (
          <div key={area.id} className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 font-semibold flex items-center gap-2" style={{ backgroundColor: area.color + '20', color: area.color }}>
              <span>{area.icon}</span><span>{area.title}</span>
            </div>
            {area.groups?.map(group => (
              <div key={group.id}>
                <div className="px-4 py-2 text-sm font-medium text-gray-500 bg-gray-50 border-t">{group.title}</div>
                <div className="divide-y">
                  {group.skills?.map(skill => {
                    const stage = childProgress[skill.id] || 'none';
                    return (
                      <div key={skill.id} className="px-4 py-2 flex justify-between items-center">
                        <span className="text-sm">{skill.title}</span>
                        <button
                          onClick={() => updateStage(skill.id, stage)}
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${STAGE_COLORS[stage]}`}
                          title="Клик — следующая стадия"
                        >
                          {STAGE_LABELS[stage]}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
