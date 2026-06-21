import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MobileShell from '../../components/MobileShell';
import { Card } from '../../components/ui';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { colors, fontSize, fontWeight, radius, shadows, spacing } from '../../lib/theme';

interface FeedbackItem {
  id: string;
  message: string;
  isAnonymous: boolean;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  author: { id: string; name: string; email: string; role: string } | null;
}

type FilterKey = 'unread' | 'all';

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}, ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function AdminFeedbackScreen() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [filter, setFilter] = useState<FilterKey>('unread');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = (f: FilterKey) =>
    api.get(`/feedback?filter=${f}`).then(r => setItems(r.data)).catch(() => {});

  useEffect(() => { if (user?.role === 'superadmin') load(filter); }, [filter, user]);

  if (loading) return null;
  if (!user || user.role !== 'superadmin') return <Redirect href="/home" />;

  const markRead = async (id: string) => {
    setBusyId(id);
    try {
      await api.post(`/feedback/${id}/read`);
      setItems(prev => prev.map(i => i.id === id ? { ...i, read: true, readAt: new Date().toISOString() } : i));
    } finally {
      setBusyId(null);
    }
  };

  const unreadCount = items.filter(i => !i.read).length;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Обратная связь', headerTintColor: colors.brand }} />
      <MobileShell eyebrow="Только для заведующей" title="Обратная связь">
        <Text style={styles.lead}>
          Сообщения видите только вы. Анонимные приходят без имени автора.
        </Text>

        <View style={styles.tabs}>
          <Pressable
            onPress={() => setFilter('unread')}
            style={[styles.tab, filter === 'unread' && styles.tabActive]}
          >
            <Text style={[styles.tabText, filter === 'unread' && styles.tabTextActive]}>
              Непрочитанные{filter === 'unread' && unreadCount > 0 ? ` · ${unreadCount}` : ''}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilter('all')}
            style={[styles.tab, filter === 'all' && styles.tabActive]}
          >
            <Text style={[styles.tabText, filter === 'all' && styles.tabTextActive]}>Все</Text>
          </Pressable>
        </View>

        {items.length === 0 ? (
          <Card padding="md">
            <View style={styles.empty}>
              <Ionicons name="mail-open-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                {filter === 'unread' ? 'Непрочитанных сообщений нет' : 'Сообщений пока нет'}
              </Text>
            </View>
          </Card>
        ) : (
          <View style={styles.stack}>
            {items.map(item => (
              <View key={item.id} style={[styles.card, !item.read && styles.cardUnread]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.row}>
                      {item.isAnonymous ? (
                        <View style={styles.anonChip}>
                          <Ionicons name="eye-off-outline" size={11} color={colors.textSecondary} />
                          <Text style={styles.anonChipText}>Анонимно</Text>
                        </View>
                      ) : (
                        <Text style={styles.authorName} numberOfLines={1}>
                          {item.author?.name || 'Удалённый пользователь'}
                        </Text>
                      )}
                      {!item.read ? (
                        <View style={styles.newChip}>
                          <Text style={styles.newChipText}>Новое</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.meta}>
                      {formatDateTime(item.createdAt)}
                      {!item.isAnonymous && item.author?.email ? ` · ${item.author.email}` : ''}
                    </Text>
                  </View>
                </View>
                <Text style={styles.message}>{item.message}</Text>
                {!item.read ? (
                  <Pressable
                    onPress={() => markRead(item.id)}
                    disabled={busyId === item.id}
                    style={[styles.readBtn, busyId === item.id && { opacity: 0.5 }]}
                  >
                    <Ionicons name="checkmark-outline" size={14} color={colors.brand} />
                    <Text style={styles.readBtnText}>Отметить прочитанным</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </MobileShell>
    </>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.md },

  tabs: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  tab: { paddingHorizontal: 12, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.borderLight, justifyContent: 'center', backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabText: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  tabTextActive: { color: colors.textInverse },

  empty: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { color: colors.textMuted, fontSize: fontSize.sm },

  stack: { gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderLight, ...shadows.sm },
  cardUnread: { borderColor: colors.brand, backgroundColor: colors.brandPale },
  cardHeader: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  authorName: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary },
  meta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  anonChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 22, borderRadius: 11, backgroundColor: colors.surfaceAlt },
  anonChipText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  newChip: { paddingHorizontal: 8, height: 20, borderRadius: 10, backgroundColor: colors.brand, justifyContent: 'center' },
  newChipText: { color: colors.textInverse, fontSize: 10, fontWeight: fontWeight.medium },
  message: { fontSize: fontSize.md, color: colors.textPrimary, lineHeight: 22, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
  readBtn: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 6, marginTop: spacing.md, paddingHorizontal: 12, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.brand, backgroundColor: colors.surface },
  readBtnText: { color: colors.brand, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
});
