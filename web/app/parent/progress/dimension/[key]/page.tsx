'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Heart, Brain, Activity } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, SectionLabel } from '@/components/ui';
import api from '@/lib/api';

type DimensionKey = 'emotion' | 'cognition' | 'body';

interface Child { id: string; name: string; }
interface SkillRow {
  id: string;
  title: string;
  description: string | null;
  group_title: string;
  zone_title: string;
  zone_color: string | null;
  stage: 'none' | 'presented' | 'practicing' | 'mastered';
  updated_at: string | null;
}

const META: Record<DimensionKey, { title: string; subtitle: string; Icon: typeof Heart; accent: string }> = {
  emotion: {
    title: 'Эмоции и общение',
    subtitle: 'Самостоятельность, забота, сотрудничество — то, как ребёнок чувствует и взаимодействует.',
    Icon: Heart,
    accent: '#993556',
  },
  cognition: {
    title: 'Мышление и память',
    subtitle: 'Концентрация, логика, восприятие, речь, счёт — основы познания мира.',
    Icon: Brain,
    accent: '#534AB7',
  },
  body: {
    title: 'Тело и движение',
    subtitle: 'Мелкая и крупная моторика, координация, тактильность, контроль движений.',
    Icon: Activity,
    accent: '#0F6E56',
  },
};

const STAGE_LABEL: Record<SkillRow['stage'], string> = {
  none: 'Не начат',
  presented: 'Знакомство',
  practicing: 'Повторение',
  mastered: 'Усвоено',
};

const STAGE_COLOR: Record<SkillRow['stage'], string> = {
  none: 'bg-slate-200',
  presented: 'bg-amber-400',
  practicing: 'bg-sky-400',
  mastered: 'bg-emerald-500',
};

export default function DimensionDetailPage() {
  const { key } = useParams<{ key: string }>();
  const dimension: DimensionKey | null =
    key === 'emotion' || key === 'cognition' || key === 'body' ? key : null;

  const [child, setChild] = useState<Child | null>(null);
  const [skills, setSkills] = useState<SkillRow[]>([]);

  useEffect(() => {
    api.get('/children').then(r => setChild((r.data || [])[0] || null));
  }, []);

  useEffect(() => {
    if (!child || !dimension) return;
    api.get(`/children/${child.id}/dimension/${dimension}`).then(r => setSkills(r.data || []));
  }, [child, dimension]);

  // Group by zone → group
  const grouped = useMemo(() => {
    const byZone = new Map<string, { color: string | null; groups: Map<string, SkillRow[]> }>();
    for (const s of skills) {
      let zoneEntry = byZone.get(s.zone_title);
      if (!zoneEntry) {
        zoneEntry = { color: s.zone_color, groups: new Map() };
        byZone.set(s.zone_title, zoneEntry);
      }
      const groupEntry = zoneEntry.groups.get(s.group_title) || [];
      groupEntry.push(s);
      zoneEntry.groups.set(s.group_title, groupEntry);
    }
    return Array.from(byZone.entries()).map(([zone, v]) => ({
      zone,
      color: v.color,
      groups: Array.from(v.groups.entries()).map(([title, list]) => ({ title, skills: list })),
    }));
  }, [skills]);

  if (!dimension) {
    return (
      <PageLayout title="Не найдено" showBackButton>
        <p className="text-sm text-slate-500">Неизвестное измерение.</p>
      </PageLayout>
    );
  }

  const meta = META[dimension];
  const Icon = meta.Icon;
  const mastered = skills.filter(s => s.stage === 'mastered').length;

  return (
    <PageLayout
      eyebrow={child ? child.name.toUpperCase() : ''}
      title={meta.title}
      showBackButton
    >
      <Card padding="md" className="mb-6">
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white"
            style={{ background: meta.accent }}
          >
            <Icon size={20} />
          </div>
          <div>
            <SectionLabel>Измерение развития</SectionLabel>
            <h2 className="font-serif text-xl mt-0.5">{meta.title}</h2>
            <p className="text-sm text-slate-600 mt-1">{meta.subtitle}</p>
            <p className="text-xs text-slate-500 mt-2">
              Освоено <span className="font-medium text-foreground">{mastered}</span> из {skills.length} навыков.
            </p>
          </div>
        </div>
      </Card>

      {grouped.length === 0 ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-6 text-center">Навыков в этом измерении пока нет.</div>
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(z => (
            <Card key={z.zone} padding="md">
              <div className="flex items-center gap-2 mb-3">
                {z.color && (
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: z.color }} />
                )}
                <SectionLabel>{z.zone}</SectionLabel>
              </div>
              <div className="space-y-4">
                {z.groups.map(g => (
                  <div key={g.title}>
                    <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-2">
                      {g.title}
                    </div>
                    <ul className="space-y-1.5">
                      {g.skills.map(s => (
                        <li key={s.id} className="flex items-center gap-3 text-sm">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STAGE_COLOR[s.stage]}`} />
                          <span className="flex-1 truncate">{s.title}</span>
                          <span className="text-xs text-slate-500 shrink-0">{STAGE_LABEL[s.stage]}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
