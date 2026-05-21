import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../lib/api';
import { colors, fontSize, fontWeight, radius, shadows, spacing, STAGE_CONFIG } from '../../lib/theme';
import { layout, useScreenLayout } from '../../lib/layout';
import type { Child, Progress } from '../../lib/types';

type DimensionKey = 'emotion' | 'cognition' | 'body';

interface DimSummary {
  mastered: number;
  total: number;
  percent: number;
  label?: string;
}

interface ZoneSummary {
  id: string;
  title: string;
  color: string;
  mastered: number;
  total: number;
  percent: number;
  label?: string;
}

interface DevelopmentSummary {
  by_dimension: Record<DimensionKey, DimSummary>;
  by_zone?: ZoneSummary[];
}

const DIMENSIONS: { key: DimensionKey; title: string; icon: keyof typeof Ionicons.glyphMap; accent: string }[] = [
  { key: 'emotion', title: 'Эмоции', icon: 'heart-outline', accent: '#993556' },
  { key: 'cognition', title: 'Мышление', icon: 'bulb-outline', accent: '#534AB7' },
  { key: 'body', title: 'Тело', icon: 'fitness-outline', accent: '#0F6E56' },
];

export default function ParentProgressScreen() {
  const [child, setChild] = useState<Child | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [summary, setSummary] = useState<DevelopmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const screen = useScreenLayout();

  const loadData = async () => {
    try {
      const { data: children } = await api.get('/children');
      const firstChild = children[0] || null;
      setChild(firstChild);
      if (firstChild) {
        const { data } = await api.get(`/children/${firstChild.id}/progress`);
        setProgress(data);
        api.get(`/children/${firstChild.id}/development-summary`)
          .then(r => setSummary(r.data))
          .catch(() => setSummary(null));
      } else {
        setProgress([]);
        setSummary(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const total = progress.length;
  const mastered = progress.filter(p => p.stage === 'mastered').length;
  const practicing = progress.filter(p => p.stage === 'practicing').length;
  const presented = progress.filter(p => p.stage === 'presented').length;
  const pct = total ? Math.round((mastered / total) * 100) : 0;

  // Локальный fallback для зон: считаем сами из progress[].skill.group.area,
  // на случай если summary endpoint вернул ошибку.
  const localZones = useMemo<ZoneSummary[]>(() => {
    const map = new Map<string, ZoneSummary>();
    for (const p of progress) {
      const a = p.skill?.group?.area;
      if (!a) continue;
      const cur = map.get(a.id) ?? {
        id: a.id,
        title: a.title,
        color: a.color || colors.brand,
        mastered: 0,
        total: 0,
        percent: 0,
      };
      cur.total++;
      if (p.stage === 'mastered') cur.mastered++;
      map.set(a.id, cur);
    }
    return Array.from(map.values()).map(z => ({
      ...z,
      percent: z.total ? Math.round((z.mastered / z.total) * 100) : 0,
    })).sort((a, b) => b.percent - a.percent);
  }, [progress]);

  const zones = summary?.by_zone?.length ? summary.by_zone : localZones;

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { padding: screen.horizontalPadding }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? <Text style={styles.muted}>Загрузка...</Text> : null}
        {!loading && !child ? <Text style={styles.muted}>Ребенок не найден</Text> : null}
        {child ? (
          <>
            {/* Главный блок прогресса */}
            <View style={styles.summary}>
              <Text style={styles.caption}>{child.name}</Text>
              <Text style={styles.title}>{pct}% освоено</Text>
              <Text style={styles.summarySub}>{mastered} из {total} навыков</Text>

              {/* Полоса прогресса */}
              <View style={styles.summaryBarBg}>
                <View style={[styles.summaryBarFill, { width: `${pct}%` }]} />
              </View>

              {/* Стэйджи: легенда */}
              <View style={styles.legendRow}>
                <LegendDot color="#7FE2A5" label={`Усвоено · ${mastered}`} />
                <LegendDot color="#A7C8F4" label={`Повторение · ${practicing}`} />
                <LegendDot color="#F8DBA3" label={`Знакомство · ${presented}`} />
              </View>
            </View>

            {/* Измерения */}
            <Text style={styles.sectionLabel}>Развитие</Text>
            <View style={styles.dimGrid}>
              {DIMENSIONS.map(dimension => {
                const item = summary?.by_dimension?.[dimension.key] ?? { mastered: 0, total: 0, percent: 0 };
                return (
                  <Pressable
                    key={dimension.key}
                    onPress={() => router.push(`/parent/progress/dimension/${dimension.key}`)}
                    style={styles.dimCard}
                  >
                    <View style={[styles.dimIcon, { backgroundColor: dimension.accent }]}>
                      <Ionicons name={dimension.icon} size={18} color={colors.textInverse} />
                    </View>
                    <Text style={styles.dimTitle}>{dimension.title}</Text>
                    <Text style={styles.dimPercent}>{item.percent}%</Text>
                    <View style={styles.dimBarBg}>
                      <View style={[styles.dimBarFill, { width: `${item.percent}%`, backgroundColor: dimension.accent }]} />
                    </View>
                    <Text style={styles.dimMeta}>{item.mastered} из {item.total}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Зоны Монтессори */}
            {zones.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>По зонам</Text>
                <View style={styles.zoneCard}>
                  {zones.map((z, idx) => (
                    <View key={z.id} style={[styles.zoneRow, idx !== zones.length - 1 && styles.zoneRowDivider]}>
                      <View style={styles.zoneRowHead}>
                        <View style={[styles.zoneDot, { backgroundColor: z.color || colors.brand }]} />
                        <Text style={styles.zoneTitle} numberOfLines={1}>{z.title}</Text>
                        <Text style={styles.zonePct}>{z.percent}%</Text>
                      </View>
                      <View style={styles.zoneBarBg}>
                        <View style={[styles.zoneBarFill, { width: `${z.percent}%`, backgroundColor: z.color || colors.brand }]} />
                      </View>
                      <Text style={styles.zoneMeta}>{z.mastered} из {z.total} навыков</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {/* Полный список навыков */}
            {progress.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>Все навыки</Text>
                {progress.map(item => {
                  const stage = STAGE_CONFIG[item.stage];
                  return (
                    <View key={item.id} style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>{item.skill?.title || 'Навык'}</Text>
                        <Text style={styles.rowMeta}>{item.skill?.group?.title || ''}</Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: stage.bg }]}>
                        <Text style={[styles.badgeText, { color: stage.text }]}>{stage.label}</Text>
                      </View>
                    </View>
                  );
                })}
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={legendStyles.item}>
      <View style={[legendStyles.dot, { backgroundColor: color }]} />
      <Text style={legendStyles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', paddingBottom: spacing.xxxl },

  summary: { backgroundColor: colors.brand, borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.lg, ...shadows.md, marginTop: spacing.md },
  caption: { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.sm },
  title: { color: colors.textInverse, fontSize: fontSize.xxxl, fontWeight: fontWeight.bold, marginTop: spacing.xs },
  summarySub: { color: 'rgba(255,255,255,0.85)', fontSize: fontSize.sm, marginTop: 2 },
  summaryBarBg: { height: 10, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 5, marginTop: spacing.lg, overflow: 'hidden' },
  summaryBarFill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: 5 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },

  sectionLabel: { color: colors.textSecondary, fontSize: fontSize.xs, textTransform: 'uppercase', fontWeight: fontWeight.medium, marginTop: spacing.md, marginBottom: spacing.sm, letterSpacing: 0.5 },

  muted: { color: colors.textSecondary, fontSize: fontSize.md },

  dimGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md },
  dimCard: { flexGrow: 1, flexBasis: '30%', minWidth: 104, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderLight, ...shadows.sm },
  dimIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  dimTitle: { color: colors.textSecondary, fontSize: fontSize.xs, textTransform: 'uppercase', fontWeight: fontWeight.medium },
  dimPercent: { color: colors.textPrimary, fontSize: fontSize.xxl, fontWeight: fontWeight.bold, marginTop: spacing.xs },
  dimBarBg: { height: 4, backgroundColor: colors.borderLight, borderRadius: 2, marginTop: spacing.sm, overflow: 'hidden' },
  dimBarFill: { height: '100%', borderRadius: 2 },
  dimMeta: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.xs },

  zoneCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderLight, marginBottom: spacing.md, ...shadows.sm },
  zoneRow: { paddingVertical: spacing.sm },
  zoneRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
  zoneRowHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  zoneDot: { width: 8, height: 8, borderRadius: 4 },
  zoneTitle: { flex: 1, color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  zonePct: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.bold, fontVariant: ['tabular-nums'] },
  zoneBarBg: { height: 6, backgroundColor: colors.borderLight, borderRadius: 3, overflow: 'hidden' },
  zoneBarFill: { height: '100%', borderRadius: 3 },
  zoneMeta: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 4 },

  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, ...shadows.sm },
  rowTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  rowMeta: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  badge: { borderRadius: radius.md, minWidth: 44, alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  badgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
});

const legendStyles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { color: 'rgba(255,255,255,0.9)', fontSize: fontSize.xs },
});
