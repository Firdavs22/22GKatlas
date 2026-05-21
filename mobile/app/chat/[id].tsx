import { useEffect, useRef, useState } from 'react';
import {
  FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import api from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { useAuth } from '../../context/AuthContext';
import { colors, fontSize, fontWeight, radius, shadows, spacing } from '../../lib/theme';
import type { ChatMessage } from '../../lib/types';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function sameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Сегодня';
  const yest = new Date(today);
  yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatId = String(id);
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState('Чат');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Загрузить историю + название (по другому участнику)
  useEffect(() => {
    if (!chatId) return;
    api.get(`/chats/${chatId}/messages`).then((r) => setMessages(r.data || [])).catch(() => {});
    api.get('/chats').then((r) => {
      const room = (r.data || []).find((c: { id: string }) => c.id === chatId);
      if (!room) return;
      const others = (room.participants || [])
        .map((p: { user?: { id: string; name: string } }) => p.user)
        .filter((u: { id: string } | undefined) => u && u.id !== user?.id);
      if (others[0]?.name) setTitle(others[0].name);
    }).catch(() => {});
  }, [chatId, user?.id]);

  // Socket: join + realtime
  useEffect(() => {
    if (!chatId) return;
    let active = true;
    let cleanup: (() => void) | null = null;

    (async () => {
      const socket = await getSocket();
      if (!socket || !active) return;

      socket.emit('joinRoom', chatId);

      const onNewMessage = (msg: ChatMessage) => {
        if (msg.chatRoomId !== chatId) return;
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        if (msg.senderId !== user?.id) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
      };

      socket.on('newMessage', onNewMessage);
      socket.on('connect', () => socket.emit('joinRoom', chatId));

      cleanup = () => socket.off('newMessage', onNewMessage);
    })();

    return () => {
      active = false;
      cleanup?.();
    };
  }, [chatId, user?.id]);

  // Авто-скролл вниз при новом сообщении
  useEffect(() => {
    if (messages.length === 0) return;
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length]);

  const send = async () => {
    if (!text.trim() || sending) return;
    const body = text.trim();
    setText('');
    setSending(true);
    try {
      const { data } = await api.post(`/chats/${chatId}/messages`, { text: body });
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
    } catch {
      // вернуть текст в инпут если не отправилось
      setText(body);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title, headerTintColor: colors.brand }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 84 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>Сообщений пока нет</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const mine = item.senderId === user?.id;
            const prev = messages[index - 1];
            const showDay = !prev || !sameDay(prev.createdAt, item.createdAt);
            return (
              <View>
                {showDay ? (
                  <View style={styles.dayChip}>
                    <Text style={styles.dayChipText}>{dayLabel(item.createdAt)}</Text>
                  </View>
                ) : null}
                <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                    {item.text ? (
                      <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.text}</Text>
                    ) : null}
                    <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>{formatTime(item.createdAt)}</Text>
                  </View>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Сообщение…"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            maxLength={2000}
          />
          <Pressable
            onPress={send}
            disabled={!text.trim() || sending}
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          >
            <Ionicons name="send" size={18} color={colors.textInverse} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, paddingBottom: spacing.lg, gap: spacing.sm },

  empty: { alignItems: 'center', paddingVertical: 100, gap: spacing.md },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted },

  dayChip: { alignSelf: 'center', backgroundColor: colors.surfaceAlt, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginVertical: spacing.md },
  dayChipText: { fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', fontWeight: fontWeight.medium, letterSpacing: 0.5 },

  bubbleRow: { width: '100%', flexDirection: 'row', marginBottom: 4 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.lg, ...shadows.sm },
  bubbleMine: { backgroundColor: colors.brand, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  bubbleText: { color: colors.textPrimary, fontSize: fontSize.md, lineHeight: 20 },
  bubbleTextMine: { color: colors.textInverse },
  bubbleTime: { color: colors.textMuted, fontSize: 10, marginTop: 2, alignSelf: 'flex-end' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.7)' },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
