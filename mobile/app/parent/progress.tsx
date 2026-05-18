import { useEffect, useState } from 'react';
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
  label: string;
}

interface DevelopmentSummary {
  by_dimension: Record<DimensionKey, DimSummary>;
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
  const pct = total ? Math.round((mastered / total) * 100) : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: true, title: 'Прогресс', headerTintColor: colors.primary }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { padding: screen.horizontalPadding }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? <Text style={styles.muted}>Загрузка...</Text> : null}
        {!loading && !child ? <Text style={styles.muted}>Ребенок не найден</Text> : null}
        {child ? (
          <>
            <View style={styles.summary}>
              <Text style={styles.caption}>{child.name}</Text>
              <Text style={styles.title}>{pct}% освоено</Text>
              <Text style={styles.muted}>{mastered} из {total} навыков</Text>
            </View>
            {summary ? (
              <View style={styles.dimGrid}>
                {DIMENSIONS.map(dimension => {
                  const item = summary.by_dimension[dimension.key];
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
                      <Text style={styles.dimPercent}>{item?.percent ?? 0}%</Text>
                      <Text style={styles.dimMeta}>{item?.mastered ?? 0} из {item?.total ?? 0}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', paddingBottom: spacing.xxxl },
  summary: { backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.xxl, marginBottom: spacing.lg, ...shadows.md },
  caption: { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.sm },
  title: { color: colors.textInverse, fontSize: fontSize.xxxl, fontWeight: fontWeight.bold, marginTop: spacing.xs },
  muted: { color: colors.textSecondary, fontSize: fontSize.md },
  dimGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  dimCard: { flexGrow: 1, flexBasis: '30%', minWidth: 104, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderLight, ...shadows.sm },
  dimIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  dimTitle: { color: colors.textSecondary, fontSize: fontSize.xs, textTransform: 'uppercase', fontWeight: fontWeight.medium },
  dimPercent: { color: colors.textPrimary, fontSize: fontSize.xxl, fontWeight: fontWeight.bold, marginTop: spacing.xs },
  dimMeta: { color: colors.textMuted, fontSize: fontSize.xs },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, ...shadows.sm },
  rowTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  rowMeta: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  badge: { borderRadius: radius.md, minWidth: 44, alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  badgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
});
