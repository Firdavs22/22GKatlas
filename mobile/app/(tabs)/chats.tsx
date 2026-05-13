import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '../../lib/theme';
import { Ionicons } from '@expo/vector-icons';
import type { ChatRoom } from '../../lib/types';

export default function ChatsScreen() {
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    api.get('/chats').then(r => { setChats(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const formatTime = (d?: string) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  };

  const renderChat = ({ item }: { item: ChatRoom }) => {
    const other = item.otherUser;
    const last = item.lastMessage;

    return (
      <TouchableOpacity style={styles.chatItem} activeOpacity={0.7}>
        <View style={styles.avatar}>
          <Text style={{ fontSize: 20 }}>
            {other?.role === 'teacher' ? '👩‍🏫' : other?.role === 'parent' ? '👨‍👩‍👧' : '💬'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>{other?.name || 'Чат'}</Text>
            {last && <Text style={styles.chatTime}>{formatTime(last.createdAt)}</Text>}
          </View>
          {last && (
            <Text style={styles.chatPreview} numberOfLines={1}>
              {last.senderId === user?.id ? 'Вы: ' : ''}{last.text}
            </Text>
          )}
        </View>
        {(item.unreadCount || 0) > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.header}>Чаты</Text>
      {loading ? (
        <Text style={styles.emptyText}>Загрузка...</Text>
      ) : chats.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>Нет активных чатов</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChat}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.textPrimary, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, gap: spacing.md },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.lg },

  chatItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.sm, gap: spacing.md,
    ...shadows.sm,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center',
  },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary, flex: 1 },
  chatTime: { fontSize: fontSize.xs, color: colors.textMuted },
  chatPreview: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },

  badge: {
    backgroundColor: colors.primary, borderRadius: 10,
    minWidth: 20, height: 20, paddingHorizontal: 6,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { fontSize: fontSize.xs, color: colors.textInverse, fontWeight: fontWeight.bold },
});
