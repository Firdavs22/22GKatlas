import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import api, { getAuthMediaUrl } from '../../lib/api';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '../../lib/theme';
import { Ionicons } from '@expo/vector-icons';
import type { FeedItem } from '../../lib/types';

export default function FeedScreen() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadFeed = async () => {
    try {
      const { data } = await api.get('/feed');
      setFeed(data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadFeed(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadFeed(); setRefreshing(false); };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffH = Math.floor(diffMs / 3600000);
    if (diffH < 1) return 'Только что';
    if (diffH < 24) return `${diffH}ч назад`;
    return date.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'child_photo': return '📸';
      case 'child_achievement': return '⭐';
      case 'group_news': return '📢';
      case 'school_news': return '🏫';
      default: return '📄';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.header}>Лента</Text>
        <Text style={styles.emptyText}>Загрузка...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.header}>Лента</Text>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {feed.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>📰</Text>
            <Text style={styles.emptyText}>Пока нет записей</Text>
          </View>
        ) : feed.map(item => (
          <View key={item.id} style={styles.card}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.authorAvatar}>
                <Text>{typeIcon(item.type)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.authorName}>{item.author?.name || 'Педагог'}</Text>
                <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
              </View>
              {item.pinned && (
                <Ionicons name="pin" size={14} color={colors.warning} />
              )}
            </View>

            {/* Content */}
            {item.title && <Text style={styles.cardTitle}>{item.title}</Text>}
            {item.text && <Text style={styles.cardText}>{item.text}</Text>}

            {/* Media placeholder */}
            {item.mediaUrls?.length > 0 && (
              <View style={styles.mediaPlaceholder}>
                <Ionicons name="image-outline" size={24} color={colors.textMuted} />
                <Text style={styles.mediaCount}>{item.mediaUrls.length} фото</Text>
              </View>
            )}

            {/* Footer */}
            <View style={styles.cardFooter}>
              <TouchableOpacity style={styles.footerButton} activeOpacity={0.7}>
                <Ionicons name="heart-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.footerText}>{item._count?.likes || 0}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.textPrimary, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  scroll: { flex: 1, paddingHorizontal: spacing.lg },

  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  authorAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center',
  },
  authorName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textPrimary },
  cardDate: { fontSize: fontSize.xs, color: colors.textMuted },
  cardTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: spacing.sm },
  cardText: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22 },

  mediaPlaceholder: {
    backgroundColor: colors.borderLight, borderRadius: radius.lg,
    height: 160, justifyContent: 'center', alignItems: 'center',
    marginTop: spacing.md, gap: spacing.sm,
  },
  mediaCount: { fontSize: fontSize.sm, color: colors.textMuted },

  cardFooter: { flexDirection: 'row', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderLight },
  footerButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  footerText: { fontSize: fontSize.sm, color: colors.textSecondary },
});
