'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { Area, Child, Progress, STAGE_LABELS } from '@/lib/types';

import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

const colors = { bg: "#FDFAF5", card: "#FFFFFF", primary: "#5B7553", primaryLight: "#E8F0E6", accent: "#D4956A", accentLight: "#FBF0E8", text: "#2D2B28", textSecondary: "#7A756E", border: "#E8E3DC" };

const LevelBadge = ({ level }: { level: number }) => {
  const config: Record<number, any> = {
    0: { label: "Пока нет", bg: "#F5F0EB", color: "#A09A93", dot: "○" },
    1: { label: "Начинает", bg: "#FFF3E0", color: "#E88F3A", dot: "◐" },
    2: { label: "Уверенно", bg: "#E8F5E9", color: "#4CAF50", dot: "●" },
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
    
    // Load full data for dashboard
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
  if (!mounted || !child) return <div className="p-10 text-center">Загрузка...</div>;

  // Compute Radar Data (Current vs Prev month)
  const computeRadarData = () => {
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return areas.map(a => {
      let currentVal = 0, prevVal = 0;
      let totalSkills = 0;
      
      a.groups?.forEach(g => g.skills?.forEach(s => {
        totalSkills++;
        const st = progress[s.id];
        if (st === 'mastered') currentVal += 100;
        else if (st === 'practicing') currentVal += 50;
        else if (st === 'presented') currentVal += 25;
        
        // Find stage 1 month ago from history
        const h = history.filter(x => x.progress.skillId === s.id && new Date(x.changedAt) <= oneMonthAgo).pop();
        const pastSt = h ? h.newStage : 'none';
        if (pastSt === 'mastered') prevVal += 100;
        else if (pastSt === 'practicing') prevVal += 50;
        else if (pastSt === 'presented') prevVal += 25;
      }));
      
      return {
        area: a.title.split(' ')[0],
        current: totalSkills ? Math.round(currentVal / totalSkills) : 0,
        prev: totalSkills ? Math.round(prevVal / totalSkills) : 0,
        full: 100
      };
    });
  };
  
  const radarData = computeRadarData();

  // Timeline Data
  const computeTimeline = () => {
    const now = new Date();
    const result = [];
    for (let i = 4; i >= 0; i--) {
       const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
       const monthStr = d.toLocaleString('ru-RU', { month: 'short' });
       const point: any = { period: monthStr };
       
       areas.forEach(a => {
         let val = 0;
         let total = 0;
         a.groups?.forEach(g => g.skills?.forEach(s => {
           total++;
           const h = history.filter(x => x.progress.skillId === s.id && new Date(x.changedAt) <= d).pop();
           const st = h ? h.newStage : 'none';
           if (st === 'mastered') val += 100;
           else if (st === 'practicing') val += 50;
           else if (st === 'presented') val += 25;
         }));
         point[a.id] = total ? Math.round(val / total) : 0;
       });
       result.push(point);
    }
    return result;
  };
  const timelineData = computeTimeline();

  const getLevel = (stage?: string) => {
    if (stage === 'mastered') return 2;
    if (stage === 'practicing') return 1;
    return 0;
  };

  return (
    <PageLayout title="Карта развития">
      <div style={{ fontFamily: "'Nunito', sans-serif" }}>
        
        {/* Child Selector */}
        <div className="mb-6 flex items-center justify-between">
          <select 
            value={selectedChild} 
            onChange={e => setSelectedChild(e.target.value)} 
            className="border-gray-300 rounded-lg shadow-sm px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
          >
            {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="text-sm text-gray-500">
             Возраст: {new Date(child.birthDate).toLocaleDateString('ru-RU')}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 16 }}>
          {[
            { id: "map", label: "Карта развития", icon: "🌳" },
            { id: "portfolio", label: "Портфолио", icon: "🎒" },
          ].map(t => (
            <TabButton key={t.id} active={activeTab === t.id} onClick={() => { setActiveTab(t.id); setSelectedArea(null); }} icon={t.icon}>{t.label}</TabButton>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px" }}>
        
        {/* === КАРТА РАЗВИТИЯ === */}
        {activeTab === "map" && !selectedArea && (
          <div>
            <div style={{ background: colors.card, borderRadius: 16, padding: "20px 16px", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 4 }}>Общая картина развития</div>
              <ResponsiveContainer width="100%" height={280}>
                {radarData.length > 0 && typeof window !== 'undefined' ? (
                <RadarChart data={radarData} cx="50%" cy="50%">
                  <PolarGrid stroke={colors.border} />
                  <PolarAngleAxis dataKey="area" tick={{ fontSize: 12, fill: colors.text }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Месяц назад" dataKey="prev" stroke="#ccc" fill="#eee" fillOpacity={0.3} strokeDasharray="4 4" />
                  <Radar name="Сейчас" dataKey="current" stroke={colors.primary} fill={colors.primary} fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
                ) : <div/>}
              </ResponsiveContainer>
              <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 12, color: colors.textSecondary }}>
                <span><span style={{ display: "inline-block", width: 12, height: 3, background: "#ccc", verticalAlign: "middle", marginRight: 4 }} /> Месяц назад</span>
                <span><span style={{ display: "inline-block", width: 12, height: 3, background: colors.primary, verticalAlign: "middle", marginRight: 4 }} /> Сейчас</span>
              </div>
            </div>

            <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: 10 }}>Области развития</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {areas.map((a, i) => {
                const d = radarData[i] || { current: 0, prev: 0 };
                const growth = d.current - d.prev;
                return (
                  <button key={a.id} onClick={() => setSelectedArea(a.id)} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                    background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12,
                    cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.15s",
                  }}>
                    <span style={{ fontSize: 24 }}>{a.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{a.title}</div>
                      <div style={{ height: 6, background: "#F0EBE5", borderRadius: 3, marginTop: 6, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${d.current}%`, background: a.color || colors.primary, borderRadius: 3, transition: "width 0.8s ease" }} />
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>{d.current}%</div>
                      {growth > 0 && <div style={{ fontSize: 11, color: "#4CAF50", fontWeight: 600 }}>+{growth}%</div>}
                    </div>
                    <span style={{ color: colors.textSecondary, fontSize: 18 }}>›</span>
                  </button>
                );
              })}
            </div>

            <div style={{ background: colors.card, borderRadius: 16, padding: "20px 16px", marginTop: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 4 }}>Динамика за всё время</div>
              <ResponsiveContainer width="100%" height={200}>
                {timelineData.length > 0 && typeof window !== 'undefined' ? (
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke={colors.border} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke={colors.border} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  {areas.map(a => <Line key={a.id} type="monotone" dataKey={a.id} stroke={a.color || colors.primary} strokeWidth={2} dot={{ r: 3 }} name={a.title.split(' ')[0]} />)}
                </LineChart>
                ) : <div/>}
              </ResponsiveContainer>
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
                 const area = areas.find(a => a.id === selectedArea);
                 if (!area) return null;
                 return (
                   <>
                    <div style={{ fontSize: 18, fontWeight: 700, color: colors.text, marginBottom: 4 }}>{area.icon} {area.title}</div>
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 20 }}>Шкала: <LevelBadge level={0} /> <LevelBadge level={1} /> <LevelBadge level={2} /></div>
                    {area.groups?.map((group) => (
                      <div key={group.id} style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${colors.border}` }}>{group.title}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {group.skills?.map(skill => (
                            <div key={skill.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <span style={{ fontSize: 13, color: colors.text, flex: 1 }}>{skill.title}</span>
                              <LevelBadge level={getLevel(progress[skill.id])} />
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
              {portfolio.map((item) => (
                <div key={item.id} style={{ background: colors.card, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <div style={{ height: 100, background: `linear-gradient(135deg, ${colors.primary}20, ${colors.primary}40)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>
                    🎒
                  </div>
                  <div style={{ padding: 12 }}>
                    <div style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 2 }}>{new Date(item.date).toLocaleDateString('ru-RU')}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.4 }}>{item.description}</div>
                    {item.mediaUrl && <a href={item.mediaUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 mt-2 block hover:underline">Открыть / Скачать</a>}
                  </div>
                </div>
              ))}
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
                  {f.mediaUrl && <img src={f.mediaUrl} alt="Вложение" style={{ marginTop: 8, borderRadius: 8, maxWidth: "100%", maxHeight: 200 }} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
