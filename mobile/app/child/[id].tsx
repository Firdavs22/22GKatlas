import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import api from '../../lib/api';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '../../lib/theme';
import { layout, useScreenLayout } from '../../lib/layout';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { STAGE_CONFIG } from '../../lib/theme';

export default function ChildProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [child, setChild] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const screen = useScreenLayout();

  const loadData = async () => {
    if (!id) return;
    try {
      const [c, p] = await Promise.all([
        api.get(`/children/${id}`),
        api.get(`/children/${id}/progress`),
      ]);
      setChild(c.data);
      setProgress(p.data);
    } catch {}
  };

  useEffect(() => { loadData(); }, [id]);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  if (!child) return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.loading}>Загрузка...</Text>
    </SafeAreaView>
  );

  // Calculate progress summary
  const total = progress.length;
  const mastered = progress.filter((p: any) => p.stage === 'mastered').length;
  const practicing = progress.filter((p: any) => p.stage === 'practicing').length;
  const presented = progress.filter((p: any) => p.stage === 'presented').length;
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;

  const age = Math.floor((Date.now() - new Date(child.birthDate).getTime()) / (365.25 * 86400000));

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: child.name, headerTintColor: colors.primary, headerStyle: { backgroundColor: colors.surface } }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: screen.horizontalPadding }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Profile header */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 40 }}>👧</Text>
          </View>
          <Text style={styles.childName}>{child.name}</Text>
          <Text style={styles.childInfo}>{age} лет · {child.group?.name || 'Без группы'}</Text>
        </View>

        {/* Progress summary */}
        <View style={styles.progressCard}>
          <Text style={styles.cardTitle}>Прогресс навыков</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressPct}>{pct}% усвоено</Text>

          <View style={styles.stageRow}>
            {[
              { stage: 'mastered', count: mastered },
              { stage: 'practicing', count: practicing },
              { stage: 'presented', count: presented },
            ].map(s => (
              <View key={s.stage} style={[styles.stageBadge, { backgroundColor: STAGE_CONFIG[s.stage as keyof typeof STAGE_CONFIG].bg }]}>
                <Text style={[styles.stageValue, { color: STAGE_CONFIG[s.stage as keyof typeof STAGE_CONFIG].text }]}>{s.count}</Text>
                <Text style={[styles.stageLabel, { color: STAGE_CONFIG[s.stage as keyof typeof STAGE_CONFIG].text }]}>{STAGE_CONFIG[s.stage as keyof typeof STAGE_CONFIG].label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick links */}
        {[
          { label: 'Наблюдения', icon: 'eye-outline' as const, desc: 'Записи педагога' },
          { label: 'Портфолио', icon: 'images-outline' as const, desc: 'Работы ребёнка' },
          { label: 'Посещаемость', icon: 'calendar-outline' as const, desc: 'Статистика дней' },
          { label: 'Домашние задания', icon: 'clipboard-outline' as const, desc: 'Задания для дома' },
        ].map(link => (
          <TouchableOpacity key={link.label} style={styles.linkItem} activeOpacity={0.7}>
            <Ionicons name={link.icon} size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.linkLabel}>{link.label}</Text>
              <Text style={styles.linkDesc}>{link.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1, backgroundColor: colors.background },
  scrollContent: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
  loading: { fontSize: fontSize.md, color: colors.textMuted, textAlign: 'center', marginTop: 80 },

  profileCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.xxl, alignItems: 'center',
    marginTop: spacing.lg, ...shadows.md,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
  },
  childName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  childInfo: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },

  progressCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.xl, marginTop: spacing.lg, ...shadows.sm,
  },
  cardTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: spacing.md },
  progressBar: {
    height: 8, backgroundColor: colors.borderLight, borderRadius: 4, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: colors.success, borderRadius: 4,
  },
  progressPct: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.sm },

  stageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.lg },
  stageBadge: {
    flex: 1, minWidth: 84, borderRadius: radius.md, paddingVertical: spacing.md,
    alignItems: 'center', gap: 2,
  },
  stageValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  stageLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },

  linkItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, marginTop: spacing.sm, gap: spacing.md,
    ...shadows.sm,
  },
  linkLabel: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary },
  linkDesc: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
});
