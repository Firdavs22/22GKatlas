import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { colors, fontSize, fontWeight, radius, shadows, spacing } from '../../lib/theme';
import type { ChatRoom } from '../../lib/types';
import MobileShell from '../../components/MobileShell';

export default function ChatsScreen() {
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    api.get('/chats')
      .then((r) => setChats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatTime = (d?: string) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <MobileShell eyebrow="Диалоги" title="Чаты">
      {loading ? <Text style={styles.emptyText}>Загрузка...</Text> : null}
      {!loading && chats.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={42} color={colors.textMuted} />
          <Text style={styles.emptyText}>Активных чатов пока нет</Text>
        </View>
      ) : null}
      {chats.map((item) => {
        const other = item.otherUser;
        const last = item.lastMessage;
        return (
          <TouchableOpacity key={item.id} style={styles.chatItem} activeOpacity={0.74}>
            <View style={styles.avatar}>
              <Ionicons
                name={other?.role === 'parent' ? 'people-outline' : other?.role === 'teacher' ? 'school-outline' : 'medkit-outline'}
                size={20}
                color={colors.brand}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatName} numberOfLines={1}>{other?.name || 'Чат'}</Text>
                {last ? <Text style={styles.chatTime}>{formatTime(last.createdAt)}</Text> : null}
              </View>
              <Text style={styles.chatPreview} numberOfLines={1}>
                {last ? `${last.senderId === user?.id ? 'Вы: ' : ''}${last.text}` : 'Сообщений пока нет'}
              </Text>
            </View>
            {(item.unreadCount || 0) > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingVertical: 80, gap: spacing.md },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted, textAlign: 'center' },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  chatName: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary, flex: 1 },
  chatTime: { fontSize: fontSize.xs, color: colors.textMuted },
  chatPreview: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  badge: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { fontSize: fontSize.xs, color: colors.textInverse, fontWeight: fontWeight.bold },
});
