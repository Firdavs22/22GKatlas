'use client';
import { useEffect, useMemo, useState } from 'react';
import { Download, Share2, ImageIcon } from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend,
} from 'recharts';
import PageLayout from '@/components/PageLayout';
import { Card, Button, Badge, SectionLabel } from '@/components/ui';
import api from '@/lib/api';
import { Area, Child, Progress } from '@/lib/types';
import AuthMedia from '@/components/AuthMedia';
import { getAuthMediaUrl } from '@/lib/media';

type TabId = 'map' | 'diary' | 'portfolio' | 'feed';
type Period = 'week' | 'month' | 'year';

const TABS: { id: TabId; label: string }[] = [
  { id: 'map', label: 'Карта' },
  { id: 'diary', label: 'Дневник' },
  { id: 'portfolio', label: 'Портфолио' },
  { id: 'feed', label: 'Лента' },
];

const PERIOD_DAYS: Record<Period, number> = { week: 7, month: 30, year: 365 };

function stageToValue(stage?: string): number {
  if (stage === 'mastered') return 100;
  if (stage === 'practicing') return 60;
  if (stage === 'presented') return 25;
  return 0;
}

function shortenAreaTitle(title: string): string {
  return title.length > 14 ? title.slice(0, 12) + '…' : title;
}

export default function ProgressPage() {
  const [activeTab, setActiveTab] = useState<TabId>('map');
  const [period, setPeriod] = useState<Period>('month');

  const [children, setChildren] = useState<Child[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [progress, setProgress] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<{ progress: { skillId: string }; newStage: string; changedAt: string }[]>([]);
  const [observations, setObservations] = useState<{ id: string; text: string; date: string; author?: { name: string } }[]>([]);
  const [portfolio, setPortfolio] = useState<{ id: string; title: string; type: string; fileUrl: string; date: string }[]>([]);
  const [feed, setFeed] = useState<{ id: string; title?: string; text?: string; mediaUrls: string[]; createdAt: string; author?: { name: string } }[]>([]);

  useEffect(() => {
    api.get('/children').then(r => setChildren(r.data));
    api.get('/admin/areas').then(r => setAreas(r.data)).catch(() => {});
  }, []);

  const child = children[0];

  useEffect(() => {
    if (!child) return;
    api.get(`/children/${child.id}/progress`).then(r => {
      const map: Record<string, string> = {};
      r.data.forEach((p: Progress) => { map[p.skillId] = p.stage; });
      setProgress(map);
    });
    api.get(`/children/${child.id}/progress-history`).then(r => setHistory(r.data)).catch(() => {});
    api.get(`/children/${child.id}/observations`).then(r => setObservations(r.data)).catch(() => {});
    api.get(`/children/${child.id}/portfolio`).then(r => setPortfolio(r.data)).catch(() => {});
    api.get(`/children/${child.id}/feed`).then(r => setFeed(r.data)).catch(() => {});
  }, [child]);

  // Per-area aggregates
  const areaStats = useMemo(() => {
    return areas.map(a => {
      let total = 0, valSum = 0;
      const skillIds: string[] = [];
      a.groups?.forEach(g => g.skills?.forEach(s => {
        total++;
        skillIds.push(s.id);
        valSum += stageToValue(progress[s.id]);
      }));
      const currentPct = total ? Math.round(valSum / total) : 0;
      return { area: a, total, currentPct, skillIds };
    });
  }, [areas, progress]);

  // Radar data: current vs N days ago
  const radarData = useMemo(() => {
    const cutoff = new Date(Date.now() - PERIOD_DAYS[period] * 24 * 3600 * 1000);
    return areaStats.map(({ area, total, currentPct, skillIds }) => {
      let prevSum = 0;
      for (const sid of skillIds) {
        const events = history.filter(x => x.progress?.skillId === sid && new Date(x.changedAt) <= cutoff);
        const last = events[events.length - 1];
        prevSum += stageToValue(last?.newStage);
      }
      const prevPct = total ? Math.round(prevSum / total) : 0;
      return {
        area: shortenAreaTitle(area.title),
        current: currentPct,
        prev: prevPct,
        delta: currentPct - prevPct,
      };
    });
  }, [areaStats, history, period]);

  const handleDownloadReport = () => {
    if (!child) return;
    window.open(`${api.defaults.baseURL}/children/${child.id}/report`, '_blank');
  };

  return (
    <PageLayout
      eyebrow={
        child
          ? `${child.name.toUpperCase()}${child.group?.name ? ` · ${child.group.name.toUpperCase()}` : ''}${child.group?.ageRange ? ` · ${child.group.ageRange.toUpperCase()}` : ''}`
          : 'Профиль ребёнка'
      }
      title="Карта развития"
      actions={
        <>
          <Button variant="outline" size="sm" onClick={handleDownloadReport}>
            <Download size={16} />
            Отчёт PDF
          </Button>
          <Button variant="primary" size="sm">
            <Share2 size={16} />
            Поделиться
          </Button>
        </>
      }
    >
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-200">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === t.id
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-500 hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar */}
          <Card padding="md">
            <div className="flex items-start justify-between mb-4">
              <div>
                <SectionLabel>Общая карта</SectionLabel>
                <h3 className="font-serif text-2xl mt-1">
                  Сейчас vs <span className="italic">{period === 'week' ? 'неделя' : period === 'month' ? 'месяц' : 'год'} назад</span>
                </h3>
              </div>
              <div className="inline-flex rounded-full bg-slate-100 p-0.5">
                {(['week', 'month', 'year'] as Period[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      period === p ? 'bg-white shadow-sm text-foreground font-medium' : 'text-slate-500'
                    }`}
                  >
                    {p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : 'Год'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="area" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name={period === 'week' ? 'Неделя назад' : period === 'month' ? 'Месяц назад' : 'Год назад'}
                    dataKey="prev"
                    stroke="#7EB3E4"
                    fill="#7EB3E4"
                    fillOpacity={0.1}
                    strokeDasharray="4 4"
                  />
                  <Radar
                    name="Сейчас"
                    dataKey="current"
                    stroke="#0F5192"
                    fill="#0F5192"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="line"
                    wrapperStyle={{ fontSize: 12, color: '#64748B' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Skill list */}
          <Card padding="md">
            <div className="mb-5">
              <SectionLabel>Области Монтессори</SectionLabel>
              <h3 className="font-serif text-2xl mt-1">Прогресс по навыкам</h3>
            </div>
            {areaStats.length === 0 ? (
              <div className="text-sm text-slate-400 py-8 text-center">Загрузка...</div>
            ) : (
              <ul className="space-y-5">
                {radarData.map((row, i) => {
                  const stat = areaStats[i];
                  return (
                    <li key={stat.area.id}>
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="font-medium text-sm">{stat.area.title}</span>
                        <span className="flex items-baseline gap-2">
                          <span className="font-serif text-lg">{stat.currentPct}%</span>
                          {row.delta > 0 && (
                            <span className="text-xs text-emerald-700">+{row.delta}</span>
                          )}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand rounded-full transition-all"
                          style={{ width: `${stat.currentPct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'diary' && (
        <div className="space-y-3">
          {observations.length === 0 ? (
            <Card padding="md">
              <div className="text-sm text-slate-400 py-6 text-center">Записей пока нет</div>
            </Card>
          ) : (
            observations.map(o => (
              <Card key={o.id} padding="md">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-medium text-sm">{o.author?.name || 'Педагог'}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(o.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{o.text}</p>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'portfolio' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {portfolio.length === 0 ? (
            <div className="col-span-full">
              <Card padding="md">
                <div className="text-sm text-slate-400 py-6 text-center">В портфолио пока пусто</div>
              </Card>
            </div>
          ) : (
            portfolio.map(item => (
              <Card key={item.id} padding="none" className="overflow-hidden">
                <div className="aspect-square bg-brand-pale/40 flex items-center justify-center">
                  {item.type === 'photo' ? (
                    <AuthMedia src={getAuthMediaUrl(item.fileUrl)} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={28} className="text-brand/50" strokeWidth={1.5} />
                  )}
                </div>
                <div className="p-3">
                  <div className="text-sm font-medium truncate">{item.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {new Date(item.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'feed' && (
        <div className="space-y-4">
          {feed.length === 0 ? (
            <Card padding="md">
              <div className="text-sm text-slate-400 py-6 text-center">Публикаций про ребёнка пока нет</div>
            </Card>
          ) : (
            feed.map(item => (
              <Card key={item.id} padding="md">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-medium text-sm">{item.author?.name || 'Педагог'}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(item.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                  </span>
                </div>
                {item.title && <h4 className="font-serif text-lg mb-1">{item.title}</h4>}
                {item.text && <p className="text-sm text-slate-700 leading-relaxed">{item.text}</p>}
                {item.mediaUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {item.mediaUrls.slice(0, 3).map((url, idx) => (
                      <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-brand-pale/40">
                        <AuthMedia src={getAuthMediaUrl(url)} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}
    </PageLayout>
  );
}
