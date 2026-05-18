import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../lib/api';
import { colors, fontSize, fontWeight, radius, shadows, spacing } from '../../lib/theme';
import { layout, useScreenLayout } from '../../lib/layout';
import type { Attendance, Child } from '../../lib/types';

const STATUS_LABELS: Record<string, string> = {
  present: 'Присутствовал',
  sick: 'Болел',
  vacation: 'Отпуск',
  absent: 'Отсутствовал',
};

export default function ParentAttendanceScreen() {
  const [child, setChild] = useState<Child | null>(null);
  const [items, setItems] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const screen = useScreenLayout();

  const loadData = async () => {
    try {
      const { data: children } = await api.get('/children');
      const firstChild = children[0] || null;
      setChild(firstChild);
      if (firstChild) {
        const { data } = await api.get(`/children/${firstChild.id}/attendance`);
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
      <Stack.Screen options={{ headerShown: true, title: 'Посещаемость', headerTintColor: colors.primary }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { padding: screen.horizontalPadding }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? <Text style={styles.muted}>Загрузка...</Text> : null}
        {!loading && !child ? <Text style={styles.muted}>Ребенок не найден</Text> : null}
        {child ? <Text style={styles.header}>{child.name}</Text> : null}
        {items.length === 0 && !loading ? <Text style={styles.muted}>Записей пока нет</Text> : null}
        {items.map(item => (
          <View key={item.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{new Date(item.date).toLocaleDateString('ru')}</Text>
              <Text style={styles.rowMeta}>{STATUS_LABELS[item.status] || item.status}</Text>
            </View>
            <View style={[styles.dot, item.status === 'present' ? styles.present : styles.absent]} />
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, ...shadows.sm },
  rowTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  rowMeta: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  present: { backgroundColor: colors.success },
  absent: { backgroundColor: colors.warning },
});
