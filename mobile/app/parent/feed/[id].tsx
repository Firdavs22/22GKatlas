import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    api.get('/feed').then(r => setItems(r.data)).catch(() => {});
  }, []);

  const item = useMemo(() => items.find(post => post.id === id), [items, id]);

  useEffect(() => {
    if (!item) return;
    setLiked(Boolean((item as any).likes?.length));
    setLikesCount(item._count?.likes || 0);
  }, [item]);

  const toggleLike = async () => {
    if (!item) return;
    try {
      const { data } = await api.post(`/feed/${item.id}/like`);
      setLiked(Boolean(data.liked));
      setLikesCount(prev => prev + (data.liked ? 1 : -1));
    } catch {
      Alert.alert('Лента', 'Не удалось обновить лайк');
    }
  };

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

            <TouchableOpacity style={styles.likeButton} activeOpacity={0.75} onPress={toggleLike}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? colors.danger : colors.textSecondary} />
              <Text style={[styles.likeText, liked && { color: colors.danger }]}>{likesCount}</Text>
            </TouchableOpacity>
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
  likeButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
  likeText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  empty: { alignItems: 'center', paddingVertical: 64 },
  emptyText: { color: colors.textMuted, fontSize: fontSize.md },
});
