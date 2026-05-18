import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../lib/api';
import { colors, DAY_NAMES, fontSize, fontWeight, radius, shadows, spacing } from '../../lib/theme';
import { layout, useScreenLayout } from '../../lib/layout';
import type { Child, Schedule } from '../../lib/types';

export default function ParentScheduleScreen() {
  const [child, setChild] = useState<Child | null>(null);
  const [items, setItems] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const screen = useScreenLayout();

  const loadData = async () => {
    try {
      const { data: children } = await api.get('/children');
      const firstChild = children[0] || null;
      setChild(firstChild);
      if (firstChild?.groupId) {
        const { data } = await api.get(`/groups/${firstChild.groupId}/schedule`);
        setItems(data);
      } else {
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: true, title: 'Расписание', headerTintColor: colors.primary }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { padding: screen.horizontalPadding }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? <Text style={styles.muted}>Загрузка...</Text> : null}
        {!loading && !child ? <Text style={styles.muted}>Ребенок не найден</Text> : null}
        {child ? <Text style={styles.header}>{child.group?.name || 'Группа'}</Text> : null}
        {items.length === 0 && !loading ? <Text style={styles.muted}>Расписание пока не заполнено</Text> : null}
        {items.map(item => (
          <View key={item.id} style={styles.row}>
            <View style={styles.time}>
              <Text style={styles.timeText}>{item.timeStart}</Text>
              <Text style={styles.timeMuted}>{item.timeEnd}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.activity}</Text>
              <Text style={styles.rowMeta}>{DAY_NAMES[item.dayOfWeek] || ''}{item.description ? ` · ${item.description}` : ''}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', paddingBottom: spacing.xxxl },
  header: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.lg },
  muted: { color: colors.textSecondary, fontSize: fontSize.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, ...shadows.sm },
  time: { width: 58, alignItems: 'center', backgroundColor: colors.primaryBg, borderRadius: radius.md, paddingVertical: spacing.sm },
  timeText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  timeMuted: { color: colors.textSecondary, fontSize: fontSize.xs },
  rowTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  rowMeta: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
});
