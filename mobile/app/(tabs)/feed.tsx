import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { API_URL } from '../../lib/api';
import { colors, fontSize, fontWeight, radius, shadows, spacing } from '../../lib/theme';
import type { FeedItem } from '../../lib/types';
import MobileShell from '../../components/MobileShell';
import PostMedia from '../../components/PostMedia';

type Period = 'all' | 'today' | 'week' | 'month';
type Sort = 'newest' | 'oldest';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'all', label: 'Всё' },
  { value: 'today', label: 'Сегодня' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
];

function inPeriod(d: Date, period: Period): boolean {
  if (period === 'all') return true;
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 86400000; // days
  if (period === 'today') return now.toDateString() === d.toDateString();
  if (period === 'week') return diff <= 7;
  if (period === 'month') return diff <= 31;
  return true;
}

function avatarSrc(url?: string) {
  if (!url) return undefined;
  return url.startsWith('http') ? url : `${API_URL}${url}`;
}

function initial(name?: string) {
  return (name?.trim().charAt(0) || '?').toUpperCase();
}

export default function FeedScreen() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('all');
  const [sort, setSort] = useState<Sort>('newest');

  useEffect(() => {
    api.get('/feed')
      .then((r) => setFeed(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const visible = feed.filter((item) => inPeriod(new Date(item.createdAt), period));
    const ordered = [...visible].sort((a, b) => {
      const t = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sort === 'newest' ? -t : t;
    });
    return ordered;
  }, [feed, period, sort]);

  const formatDate = (d: string) => {
    const date = new Date(d);
    const diffH = Math.floor((Date.now() - date.getTime()) / 3600000);
    if (diffH < 1) return 'только что';
    if (diffH < 24) return `${diffH} ч назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const typeIcon = (type: string) => {
    if (type === 'child_photo') return 'images-outline';
    if (type === 'child_achievement') return 'star-outline';
    if (type === 'group_news') return 'megaphone-outline';
    return 'document-text-outline';
  };

  return (
    <MobileShell eyebrow="Группа" title="Лента">
      {/* Фильтры */}
      <View style={styles.filtersWrap}>
        <View style={styles.filterRow}>
          {PERIOD_OPTIONS.map((opt) => {
            const active = period === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setPeriod(opt.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={() => setSort((s) => (s === 'newest' ? 'oldest' : 'newest'))}
          style={styles.sortBtn}
        >
          <Ionicons name={sort === 'newest' ? 'arrow-down-outline' : 'arrow-up-outline'} size={14} color={colors.textSecondary} />
          <Text style={styles.sortText}>{sort === 'newest' ? 'Сначала новые' : 'Сначала старые'}</Text>
        </Pressable>
      </View>

      {loading ? <Text style={styles.emptyText}>Загрузка...</Text> : null}
      {!loading && filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="newspaper-outline" size={42} color={colors.textMuted} />
          <Text style={styles.emptyText}>{feed.length === 0 ? 'Записей пока нет' : 'Нет записей за выбранный период'}</Text>
        </View>
      ) : null}

      {filtered.map((item) => {
        const author = (item as unknown as { author?: { name?: string; avatar?: string } }).author;
        const authorAvatar = avatarSrc(author?.avatar);
        return (
        <Pressable key={item.id} style={styles.card} onPress={() => router.push(`/parent/feed/${item.id}`)}>
          <View style={styles.cardHeader}>
            {authorAvatar ? (
              <Image source={{ uri: authorAvatar }} style={styles.authorAvatarImg} />
            ) : (
              <View style={styles.authorAvatar}>
                <Text style={styles.authorAvatarText}>{initial(author?.name)}</Text>
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.authorName} numberOfLines={1}>{author?.name || 'Педагог'}</Text>
              <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
            </View>
            {item.pinned ? <Ionicons name="pin" size={14} color={colors.warning} /> : null}
          </View>

          {item.title ? <Text style={styles.cardTitle}>{item.title}</Text> : null}
          {item.text ? <Text style={styles.cardText}>{item.text}</Text> : null}

          {item.mediaUrls?.length > 0 ? <PostMedia urls={item.mediaUrls} compact /> : null}

          <View style={styles.cardFooter}>
            <View style={styles.typeChip}>
              <Ionicons name={typeIcon(item.type)} size={12} color={colors.textMuted} />
            </View>
          </View>
        </Pressable>
        );
      })}
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingVertical: 80, gap: spacing.md },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  authorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brandPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorAvatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brandPale,
  },
  authorAvatarText: { color: colors.brand, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  authorName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textPrimary },
  cardDate: { fontSize: fontSize.xs, color: colors.textMuted },
  cardTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: spacing.sm },
  cardText: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: spacing.md },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 22, borderRadius: 11, backgroundColor: colors.surfaceAlt },

  filtersWrap: { gap: spacing.sm, marginBottom: spacing.md },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: 12, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.borderLight, justifyContent: 'center', backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  chipTextActive: { color: colors.textInverse },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: colors.surfaceAlt },
  sortText: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
});
