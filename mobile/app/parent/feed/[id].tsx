import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import MobileShell from '../../../components/MobileShell';
import PostMedia from '../../../components/PostMedia';
import api from '../../../lib/api';
import { colors, fontSize, fontWeight, radius, shadows, spacing } from '../../../lib/theme';
import type { FeedItem } from '../../../lib/types';

const TYPE_LABEL: Record<string, string> = {
  child_photo: 'фото',
  child_achievement: 'достижение',
  group_news: 'новость',
  school_news: 'новость',
  menu: 'меню',
  event: 'событие',
};

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return `${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} в ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function ParentFeedDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [items, setItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    api.get('/feed').then(r => setItems(r.data)).catch(() => {});
  }, []);

  const item = useMemo(() => items.find(post => post.id === id), [items, id]);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Публикация', headerTintColor: colors.brand }} />
      <MobileShell eyebrow="Лента" title={item?.title || 'Публикация'}>
        {!item ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Загрузка...</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.header}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(item.author?.name || 'А').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.author} numberOfLines={1}>{item.author?.name || 'Администрация'}</Text>
                <Text style={styles.meta}>
                  {item.scope === 'school' ? 'школа' : item.group?.name || 'группа'} · {formatDateTime(item.createdAt)}
                </Text>
              </View>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>{TYPE_LABEL[item.type] || item.type}</Text>
              </View>
            </View>

            {item.text ? <Text style={styles.text}>{item.text}</Text> : null}
            <PostMedia urls={item.mediaUrls || []} />
          </View>
        )}
      </MobileShell>
    </>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderLight, ...shadows.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brandPale, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.brand, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  author: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  meta: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
  typeBadge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 5, backgroundColor: colors.brandPale },
  typeText: { color: colors.brand, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  text: { color: colors.textSecondary, fontSize: fontSize.md, lineHeight: 23 },
  empty: { alignItems: 'center', paddingVertical: 64 },
  emptyText: { color: colors.textMuted, fontSize: fontSize.md },
});
