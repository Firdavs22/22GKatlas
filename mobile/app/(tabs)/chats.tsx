import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import api, { API_URL } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { colors, fontSize, fontWeight, radius, shadows, spacing } from '../../lib/theme';
import type { ChatRoom, ChatMessage } from '../../lib/types';
import MobileShell from '../../components/MobileShell';

const ROLE_LABEL: Record<string, string> = {
  teacher: 'Педагог',
  parent: 'Родитель',
  psychologist: 'Психолог',
  pediatrician: 'Педиатр',
  admin: 'Администратор',
  superadmin: 'Администратор',
};

function avatarSrc(url?: string) {
  if (!url) return undefined;
  return url.startsWith('http') ? url : `${API_URL}${url}`;
}

function initial(name?: string) {
  return (name?.trim().charAt(0) || '?').toUpperCase();
}

export default function ChatsScreen() {
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  const reload = () => api.get('/chats').then((r) => setChats(r.data)).catch(() => {});

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  // Realtime: подписываемся на newMessage из всех своих чатов и обновляем список.
  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | null = null;

    (async () => {
      const socket = await getSocket();
      if (!socket || !active) return;

      // Заходим во все свои комнаты, чтобы получать newMessage от каждой.
      const joinAll = (rooms: ChatRoom[]) => {
        rooms.forEach((r) => socket.emit('joinRoom', r.id));
      };
      // Текущий список — войти в комнаты
      api.get('/chats').then((r) => {
        if (!active) return;
        const list = (r.data || []) as ChatRoom[];
        setChats(list);
        joinAll(list);
      });

      const onNewMessage = (msg: ChatMessage) => {
        // Обновляем последнее сообщение и unreadCount у нужного чата
        setChats((prev) => {
          const idx = prev.findIndex((c) => c.id === msg.chatRoomId);
          if (idx < 0) {
            // Новый чат — перезагружаем список
            reload();
            return prev;
          }
          const updated = [...prev];
          const cur = { ...updated[idx] };
          cur.lastMessage = msg;
          cur.messages = [msg];
          if (msg.senderId !== userIdRef.current) {
            cur.unreadCount = (cur.unreadCount || 0) + 1;
          }
          // Поднимаем чат наверх списка
          updated.splice(idx, 1);
          updated.unshift(cur);
          return updated;
        });
        // Виброотклик только для входящих
        if (msg.senderId !== userIdRef.current) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
      };

      socket.on('newMessage', onNewMessage);
      socket.on('connect', () => {
        // После реконнекта — войти заново во все комнаты и обновить список
        api.get('/chats').then((r) => {
          if (!active) return;
          const list = (r.data || []) as ChatRoom[];
          setChats(list);
          joinAll(list);
        });
      });

      cleanup = () => {
        socket.off('newMessage', onNewMessage);
      };
    })();

    return () => {
      active = false;
      cleanup?.();
    };
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
        // Бэкенд возвращает participants + messages[0], otherUser/lastMessage вычисляем тут.
        const others = (item.participants || [])
          .map(p => (p as unknown as { user?: { id: string; name: string; avatar?: string; role: string } }).user)
          .filter((u): u is { id: string; name: string; avatar?: string; role: string } => !!u && u.id !== user?.id);
        const other = item.otherUser ?? others[0];
        const last = item.lastMessage ?? item.messages?.[0];
        const otherAvatar = avatarSrc(other?.avatar);
        const roleLabel = other?.role ? ROLE_LABEL[other.role] || other.role : '';

        return (
          <TouchableOpacity
            key={item.id}
            style={styles.chatItem}
            activeOpacity={0.74}
            onPress={() => router.push(`/chat/${item.id}` as never)}
          >
            {otherAvatar ? (
              <Image source={{ uri: otherAvatar }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial(other?.name)}</Text>
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatName} numberOfLines={1}>{other?.name || 'Чат'}</Text>
                {last ? <Text style={styles.chatTime}>{formatTime(last.createdAt)}</Text> : null}
              </View>
              {roleLabel ? <Text style={styles.chatRole}>{roleLabel}</Text> : null}
              <Text style={styles.chatPreview} numberOfLines={1}>
                {last ? `${last.senderId === user?.id ? 'Вы: ' : ''}${last.text || (last.attachments?.length ? '📎 Вложение' : '')}` : 'Сообщений пока нет'}
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
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandPale,
  },
  avatarText: { color: colors.brand, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  chatName: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary, flex: 1 },
  chatRole: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
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
