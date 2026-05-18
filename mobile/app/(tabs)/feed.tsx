import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { colors, fontSize, fontWeight, radius, shadows, spacing } from '../../lib/theme';
import type { FeedItem } from '../../lib/types';
import MobileShell from '../../components/MobileShell';

export default function FeedScreen() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/feed')
      .then((r) => setFeed(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
      {loading ? <Text style={styles.emptyText}>Загрузка...</Text> : null}
      {!loading && feed.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="newspaper-outline" size={42} color={colors.textMuted} />
          <Text style={styles.emptyText}>Записей пока нет</Text>
        </View>
      ) : null}

      {feed.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.authorAvatar}>
              <Ionicons name={typeIcon(item.type)} size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.authorName} numberOfLines={1}>{item.author?.name || 'Педагог'}</Text>
              <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
            </View>
            {item.pinned ? <Ionicons name="pin" size={14} color={colors.warning} /> : null}
          </View>

          {item.title ? <Text style={styles.cardTitle}>{item.title}</Text> : null}
          {item.text ? <Text style={styles.cardText}>{item.text}</Text> : null}

          {item.mediaUrls?.length > 0 ? (
            <View style={styles.mediaPlaceholder}>
              <Ionicons name="image-outline" size={24} color={colors.textMuted} />
              <Text style={styles.mediaCount}>{item.mediaUrls.length} фото</Text>
            </View>
          ) : null}

          <View style={styles.cardFooter}>
            <TouchableOpacity style={styles.footerButton} activeOpacity={0.7}>
              <Ionicons name="heart-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.footerText}>{item._count?.likes || 0}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
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
  authorName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textPrimary },
  cardDate: { fontSize: fontSize.xs, color: colors.textMuted },
  cardTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: spacing.sm },
  cardText: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22 },
  mediaPlaceholder: {
    backgroundColor: colors.borderLight,
    borderRadius: radius.lg,
    aspectRatio: 16 / 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  mediaCount: { fontSize: fontSize.sm, color: colors.textMuted },
  cardFooter: { flexDirection: 'row', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderLight },
  footerButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  footerText: { fontSize: fontSize.sm, color: colors.textSecondary },
});
