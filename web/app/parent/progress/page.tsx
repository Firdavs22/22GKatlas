'use client';
import { useEffect, useMemo, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { Area, Child, Progress } from '@/lib/types';
import AuthMedia from '@/components/AuthMedia';
import { getAuthMediaUrl } from '@/lib/media';

import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';

const colors = { bg: "#FDFAF5", card: "#FFFFFF", primary: "#5B7553", primaryLight: "#E8F0E6", accent: "#D4956A", accentLight: "#FBF0E8", text: "#2D2B28", textSecondary: "#7A756E", border: "#E8E3DC" };

const LevelBadge = ({ level }: { level: number }) => {
  const config: Record<number, any> = {
    0: { label: "Пока нет", bg: "#F5F0EB", color: "#A09A93", dot: "○" },
    1: { label: "Знакомство", bg: "#FFF8E1", color: "#C9A227", dot: "◔" },
    2: { label: "Практикует", bg: "#FFF3E0", color: "#E88F3A", dot: "◐" },
    3: { label: "Освоено", bg: "#E8F5E9", color: "#4CAF50", dot: "●" },
  };
  const c = config[level] || config[0];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 12, background: c.bg, color: c.color, fontSize: 12, fontWeight: 600 }}>
      {c.dot} {c.label}
    </span>
  );
};

const TabButton = ({ active, onClick, children, icon }: any) => (
  <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", border: "none", borderRadius: 12,
      background: active ? colors.primary : "transparent", color: active ? "#fff" : colors.textSecondary,
      fontSize: 14, fontWeight: active ? 600 : 500, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
  }}>
    <span style={{ fontSize: 16 }}>{icon}</span>{children}
  </button>
);

// Map area title keywords -> sensitive period age windows (Maria Montessori).
// Returns true if the child age (in years) falls in the typical sensitive window for the area.
function isAreaSensitive(areaTitle: string, ageYears: number): boolean {
  const t = areaTitle.toLowerCase();
  if (t.includes('практ')) return ageYears >= 1.5 && ageYears <= 4;       // практическая жизнь
  if (t.includes('сенсор')) return ageYears >= 2 && ageYears <= 6;        // сенсорика
  if (t.includes('язык') || t.includes('речь')) return ageYears >= 1.5 && ageYears <= 6;
  if (t.includes('математ')) return ageYears >= 4 && ageYears <= 6;
  if (t.includes('космич') || t.includes('окружа')) return ageYears >= 5 && ageYears <= 8;
  if (t.includes('социал') || t.includes('эмоц')) return ageYears >= 2.5 && ageYears <= 6;
  if (t.includes('физич') || t.includes('движен')) return ageYears >= 0 && ageYears <= 4;
  return false;
}

function ageInYears(birthDate: string | Date): number {
  const d = new Date(birthDate);
  const now = new Date();
  return (now.getTime() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
}

function stageToValue(stage?: string): number {
  if (stage === 'mastered') return 100;
  if (stage === 'practicing') return 60;
  if (stage === 'presented') return 25;
  return 0;
}

function stageToLevel(stage?: string): number {
  if (stage === 'mastered') return 3;
  if (stage === 'practicing') return 2;
  if (stage === 'presented') return 1;
  return 0;
}

export default function MontessoriDashboard() {
  const [activeTab, setActiveTab] = useState("map");
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState('');

  const [areas, setAreas] = useState<Area[]>([]);
  const [progress, setProgress] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<any[]>([]);
  const [observations, setObservations] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    api.get('/children').then(r => {
      setChildren(r.data);
      if (r.data.length > 0) setSelectedChild(r.data[0].id);
    });
    api.get('/admin/areas').then(r => setAreas(r.data));
  }, []);

  useEffect(() => {
    if (!selectedChild) return;
    api.get(`/children/${selectedChild}/progress`).then(r => {
      const map: Record<string, string> = {};
      r.data.forEach((p: Progress) => { map[p.skillId] = p.stage; });
      setProgress(map);
    });
    api.get(`/children/${selectedChild}/progress-history`).then(r => setHistory(r.data));
    api.get(`/children/${selectedChild}/observations`).then(r => setObservations(r.data));
    api.get(`/children/${selectedChild}/portfolio`).then(r => setPortfolio(r.data));
    api.get(`/children/${selectedChild}/feed`).then(r => setFeed(r.data));
  }, [selectedChild]);

  const child = children.find(c => c.id === selectedChild);

  // Aggregate stats per area: skill counts, history dates of stage transitions ────────
  const areaStats = useMemo(() => {
    return areas.map(a => {
      let total = 0, mastered = 0, practicing = 0, presented = 0;
      const skillIds: string[] = [];
      a.groups?.forEach(g => g.skills?.forEach(s => {
        total++;
        skillIds.push(s.id);
        const st = progress[s.id];
        if (st === 'mastered') mastered++;
        else if (st === 'practicing') practicing++;
        else if (st === 'presented') presented++;
      }));
      const valSum = mastered * 100 + practicing * 60 + presented * 25;
      const currentPct = total ? Math.round(valSum / total) : 0;
      return { area: a, total, mastered, practicing, presented, currentPct, skillIds };
    });
  }, [areas, progress]);

  // Radar data: current % vs % one month ago ────────────────────────────────────────
  const radarData = useMemo(() => {
    const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    return areaStats.map(({ area, total, currentPct, skillIds }) => {
      let prevSum = 0;
      for (const sid of skillIds) {
        const events = history.filter(x => x.progress.skillId === sid && new Date(x.changedAt) <= monthAgo);
        const last = events[events.length - 1];
        prevSum += stageToValue(last?.newStage);
      }
      const prevPct = total ? Math.round(prevSum / total) : 0;
      return {
        // Short label for radar axis (e.g. "Математика", "Соц-эмоц")
        area: area.title.length > 14 ? area.title.slice(0, 13) + '…' : area.title,
        current: currentPct,
        prev: prevPct,
      };
    });
  }, [areaStats, history]);

  // Timeline: 6 monthly snapshots ────────────────────────────────────────────────────
  const timelineData = useMemo(() => {
    const result: any[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i + 1, 0); // end of month i months back
      const monthStr = d.toLocaleString('ru-RU', { month: 'short' });
      const point: any = { period: monthStr };
      for (const { area, skillIds, total } of areaStats) {
        let sum = 0;
        for (const sid of skillIds) {
          const events = history.filter(x => x.progress.skillId === sid && new Date(x.changedAt) <= d);
          const last = events[events.length - 1];
          sum += stageToValue(last?.newStage);
        }
        point[area.id] = total ? Math.round(sum / total) : 0;
      }
      result.push(point);
    }
    return result;
  }, [areaStats, history]);

  // Top achievements: skills that reached 'mastered' in last 30 days ─────────────────
  const topAchievements = useMemo(() => {
    const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const items: { skillTitle: string; areaTitle: string; date: Date }[] = [];
    for (const ev of history) {
      if (ev.newStage !== 'mastered') continue;
      const d = new Date(ev.changedAt);
      if (d < monthAgo) continue;
      const skillId = ev.progress?.skillId;
      let skillTitle = '', areaTitle = '';
      for (const a of areas) {
        for (const g of a.groups || []) {
          const sk = g.skills?.find(s => s.id === skillId);
          if (sk) { skillTitle = sk.title; areaTitle = a.title; break; }
        }
        if (skillTitle) break;
      }
      if (skillTitle) items.push({ skillTitle, areaTitle, date: d });
    }
    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    return items.slice(0, 5);
  }, [history, areas]);

  if (!mounted || !child) return <div className="p-10 text-center">Загрузка...</div>;

  const childAge = ageInYears(child.birthDate);
  const childAgeText = `${Math.floor(childAge)} ${childAge < 2 ? 'год' : childAge < 5 ? 'года' : 'лет'}`;

  // Overall mastery
  const totalSkills = areaStats.reduce((s, a) => s + a.total, 0);
  const totalMastered = areaStats.reduce((s, a) => s + a.mastered, 0);
  const totalPracticing = areaStats.reduce((s, a) => s + a.practicing, 0);
  const overallPct = totalSkills ? Math.round((totalMastered * 100 + totalPracticing * 60) / totalSkills) : 0;

  return (
    <PageLayout title="Карта развития">
      <div style={{ fontFamily: "'Nunito', sans-serif" }}>
        {/* Child Selector */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
          <select
            value={selectedChild}
            onChange={e => setSelectedChild(e.target.value)}
            className="border-gray-300 rounded-lg shadow-sm px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
          >
            {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="text-sm text-gray-500">
            Возраст: {childAgeText} • Род. {new Date(child.birthDate).toLocaleDateString('ru-RU')}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 16 }}>
          {[
            { id: "map", label: "Карта развития", icon: "🌳" },
            { id: "diary", label: "Дневник", icon: "📖" },
            { id: "portfolio", label: "Портфолио", icon: "🎒" },
            { id: "events", label: "Лента", icon: "📰" },
          ].map(t => (
            <TabButton key={t.id} active={activeTab === t.id} onClick={() => { setActiveTab(t.id); setSelectedArea(null); }} icon={t.icon}>{t.label}</TabButton>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px" }}>

        {/* === КАРТА РАЗВИТИЯ === */}
        {activeTab === "map" && !selectedArea && (
          <div>
            {/* Summary card */}
            <div style={{ background: `linear-gradient(135deg, ${colors.primary}, #6F8C66)`, color: '#fff', borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 13, opacity: 0.85 }}>Общий прогресс</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
                <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{overallPct}%</div>
                <div style={{ fontSize: 14, opacity: 0.9 }}>{totalMastered} из {totalSkills} навыков освоено</div>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.25)', borderRadius: 4, marginTop: 12, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${overallPct}%`, background: '#fff', borderRadius: 4, transition: 'width 0.8s ease' }} />
              </div>
            </div>

            {/* Top achievements card */}
            {topAchievements.length > 0 && (
              <div style={{ background: colors.card, borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  ✨ Достижения за месяц
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {topAchievements.map((a, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < topAchievements.length - 1 ? `1px dashed ${colors.border}` : 'none' }}>
                      <span style={{ fontSize: 18 }}>🌟</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: colors.text, fontWeight: 600 }}>{a.skillTitle}</div>
                        <div style={{ fontSize: 11, color: colors.textSecondary }}>{a.areaTitle}</div>
                      </div>
                      <div style={{ fontSize: 11, color: colors.textSecondary }}>{a.date.toLocaleDateString('ru-RU')}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Radar */}
            <div style={{ background: colors.card, borderRadius: 16, padding: "20px 16px", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 4 }}>Общая картина развития</div>
              <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>Зелёная — сейчас, серая пунктирная — месяц назад</div>
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke={colors.border} />
                    <PolarAngleAxis dataKey="area" tick={{ fontSize: 10, fill: colors.text }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Месяц назад" dataKey="prev" stroke="#bbb" fill="#ddd" fillOpacity={0.3} strokeDasharray="4 4" />
                    <Radar name="Сейчас" dataKey="current" stroke={colors.primary} fill={colors.primary} fillOpacity={0.25} strokeWidth={2} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textSecondary, fontSize: 13 }}>
                  Недостаточно данных для диаграммы
                </div>
              )}
            </div>

            {/* Areas list with sensitive period badge */}
            <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: 10 }}>Области развития</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {areaStats.map(({ area, total, mastered, currentPct }, i) => {
                const prev = radarData[i]?.prev ?? 0;
                const growth = currentPct - prev;
                const sensitive = isAreaSensitive(area.title, childAge);
                return (
                  <button key={area.id} onClick={() => setSelectedArea(area.id)} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                    background: colors.card,
                    border: `1px solid ${sensitive ? area.color || colors.primary : colors.border}`,
                    borderRadius: 12,
                    cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.15s",
                    boxShadow: sensitive ? `0 0 0 2px ${(area.color || colors.primary)}20` : 'none',
                  }}>
                    <span style={{ fontSize: 24 }}>{area.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{area.title}</div>
                        {sensitive && (
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: `${area.color || colors.primary}20`, color: area.color || colors.primary, fontWeight: 700 }}>
                            🌱 сензитивный период
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{mastered} из {total} освоено</div>
                      <div style={{ height: 6, background: "#F0EBE5", borderRadius: 3, marginTop: 6, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${currentPct}%`, background: area.color || colors.primary, borderRadius: 3, transition: "width 0.8s ease" }} />
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>{currentPct}%</div>
                      {growth > 0 && <div style={{ fontSize: 11, color: "#4CAF50", fontWeight: 600 }}>+{growth}%</div>}
                    </div>
                    <span style={{ color: colors.textSecondary, fontSize: 18 }}>›</span>
                  </button>
                );
              })}
            </div>

            {/* Timeline */}
            <div style={{ background: colors.card, borderRadius: 16, padding: "20px 16px", marginTop: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 4 }}>Динамика за 6 месяцев</div>
              <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>Прогресс по областям, %</div>
              {timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={timelineData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke={colors.border} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke={colors.border} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    {areas.map(a => <Line key={a.id} type="monotone" dataKey={a.id} stroke={a.color || colors.primary} strokeWidth={2} dot={{ r: 2 }} name={a.title.length > 12 ? a.title.slice(0,11)+'…' : a.title} />)}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textSecondary, fontSize: 13 }}>
                  Накопим данные за несколько месяцев работы
                </div>
              )}
            </div>
          </div>
        )}

        {/* === ДЕТАЛИ ОБЛАСТИ === */}
        {activeTab === "map" && selectedArea && (
          <div>
            <button onClick={() => setSelectedArea(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: colors.primary, fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "0 0 12px" }}>
              ‹ Назад к карте
            </button>
            <div style={{ background: colors.card, borderRadius: 16, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              {(() => {
                const stat = areaStats.find(a => a.area.id === selectedArea);
                if (!stat) return null;
                const { area, total, mastered, practicing, presented } = stat;
                return (
                  <>
                    <div style={{ fontSize: 18, fontWeight: 700, color: colors.text, marginBottom: 4 }}>{area.icon} {area.title}</div>
                    <div style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>
                      Освоено {mastered} • Практикует {practicing} • Знакомство {presented} • Всего {total}
                    </div>
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 20 }}>
                      Шкала: <LevelBadge level={0} /> <LevelBadge level={1} /> <LevelBadge level={2} /> <LevelBadge level={3} />
                    </div>
                    {area.groups?.map((group) => (
                      <div key={group.id} style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${colors.border}` }}>{group.title}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {group.skills?.map(skill => (
                            <div key={skill.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <span style={{ fontSize: 13, color: colors.text, flex: 1 }}>{skill.title}</span>
                              <LevelBadge level={stageToLevel(progress[skill.id])} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* === ДНЕВНИК === */}
        {activeTab === "diary" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {observations.length === 0 && <div className="text-gray-500 text-center py-10">Нет записей в дневнике</div>}
            {observations.map((obs) => (
              <div key={obs.id} style={{ background: colors.card, borderRadius: 14, padding: 16, borderLeft: `4px solid ${colors.primary}`, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>📖</span>
                  <span style={{ fontSize: 12, color: colors.textSecondary, fontWeight: 600 }}>{new Date(obs.createdAt).toLocaleDateString('ru-RU')}</span>
                </div>
                <div style={{ fontSize: 14, color: colors.text, lineHeight: 1.55 }}>{obs.text}</div>
              </div>
            ))}
          </div>
        )}

        {/* === ПОРТФОЛИО === */}
        {activeTab === "portfolio" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {portfolio.length === 0 && <div className="col-span-2 text-gray-500 text-center py-10">Портфолио пусто</div>}
              {portfolio.map((item) => {
                const isImage = item.fileUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.fileUrl);
                const isVideo = item.fileUrl && /\.(mp4|mov|webm)$/i.test(item.fileUrl);
                return (
                  <div key={item.id} style={{ background: colors.card, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                    {isImage ? (
                      <AuthMedia src={item.fileUrl} alt={item.title} style={{ width: "100%", height: 160, objectFit: "cover" }} />
                    ) : isVideo ? (
                      <AuthMedia src={item.fileUrl} alt={item.title} type="video" style={{ width: "100%", height: 160, objectFit: "cover" }} />
                    ) : (
                      <div style={{ height: 100, background: `linear-gradient(135deg, ${colors.primary}20, ${colors.primary}40)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>
                        🎒
                      </div>
                    )}
                    <div style={{ padding: 12 }}>
                      <div style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 2 }}>{new Date(item.date).toLocaleDateString('ru-RU')}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, marginBottom: 4 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.4 }}>{item.description}</div>
                      {item.fileUrl && !isImage && !isVideo && <a href={getAuthMediaUrl(item.fileUrl)} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 mt-2 block hover:underline">Открыть / Скачать</a>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* === ЛЕНТА === */}
        {activeTab === "events" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {feed.length === 0 && <div className="text-gray-500 text-center py-10">Лента пуста</div>}
            {feed.map((f) => (
              <div key={f.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: colors.card, borderRadius: 12, padding: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: colors.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                  📰
                </div>
                <div>
                  <div style={{ fontSize: 11, color: colors.textSecondary, fontWeight: 600 }}>{new Date(f.createdAt).toLocaleDateString()}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{f.text}</div>
                  {f.mediaUrls && f.mediaUrls.length > 0 && <AuthMedia src={f.mediaUrls[0]} alt="Вложение" style={{ marginTop: 8, borderRadius: 8, maxWidth: "100%", maxHeight: 200 }} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
