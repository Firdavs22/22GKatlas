import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../lib/api';
import { colors, fontSize, fontWeight, radius, shadows, spacing, STAGE_CONFIG } from '../../lib/theme';
import { layout, useScreenLayout } from '../../lib/layout';
import type { Child, Progress } from '../../lib/types';

export default function ParentProgressScreen() {
  const [child, setChild] = useState<Child | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);
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
      } else {
        setProgress([]);
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
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, ...shadows.sm },
  rowTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  rowMeta: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  badge: { borderRadius: radius.md, minWidth: 44, alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  badgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
});
