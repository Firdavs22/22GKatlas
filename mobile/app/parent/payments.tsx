import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../lib/api';
import { colors, fontSize, fontWeight, radius, shadows, spacing } from '../../lib/theme';
import type { Child, Payment } from '../../lib/types';

const STATUS_LABELS: Record<string, string> = {
  paid: 'Оплачено',
  pending: 'Ожидает оплаты',
  overdue: 'Просрочено',
};

export default function ParentPaymentsScreen() {
  const [child, setChild] = useState<Child | null>(null);
  const [items, setItems] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const { data: children } = await api.get('/children');
      const firstChild = children[0] || null;
      setChild(firstChild);
      if (firstChild) {
        const { data } = await api.get(`/children/${firstChild.id}/payments`);
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
      <Stack.Screen options={{ headerShown: true, title: 'Оплата', headerTintColor: colors.primary }} />
      <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {loading ? <Text style={styles.muted}>Загрузка...</Text> : null}
        {!loading && !child ? <Text style={styles.muted}>Ребенок не найден</Text> : null}
        {child ? <Text style={styles.header}>{child.name}</Text> : null}
        {items.length === 0 && !loading ? <Text style={styles.muted}>Начислений пока нет</Text> : null}
        {items.map(item => {
          const amount = Number(item.amount);
          const paid = Number(item.paid);
          return (
            <View key={item.id} style={styles.card}>
              <Text style={styles.month}>{new Date(item.month).toLocaleDateString('ru', { month: 'long', year: 'numeric' })}</Text>
              <Text style={styles.amount}>{paid.toLocaleString('ru-RU')} / {amount.toLocaleString('ru-RU')} ₽</Text>
              <Text style={[styles.status, item.status === 'paid' ? styles.statusPaid : styles.statusPending]}>
                {STATUS_LABELS[item.status] || item.status}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1, padding: spacing.lg },
  header: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.lg },
  muted: { color: colors.textSecondary, fontSize: fontSize.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, ...shadows.sm },
  month: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium, textTransform: 'capitalize' },
  amount: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginTop: spacing.sm },
  status: { fontSize: fontSize.sm, marginTop: spacing.xs },
  statusPaid: { color: colors.success },
  statusPending: { color: colors.warning },
});
