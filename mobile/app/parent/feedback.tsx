import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../lib/api';
import { colors, fontSize, fontWeight, radius, shadows, spacing } from '../../lib/theme';

const MAX_LEN = 4000;

export default function ParentFeedbackScreen() {
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const canSend = message.trim().length >= 3 && !sending;

  const submit = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await api.post('/feedback', { message: message.trim(), isAnonymous: anonymous });
      setSent(true);
      setMessage('');
      setAnonymous(false);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('Ошибка', msg || 'Не удалось отправить');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: 'Обратная связь', headerTintColor: colors.brand }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.lead}>
            Ваше мнение читает только заведующая. Педагоги и обычные администраторы это сообщение не увидят.
            Включите «Анонимно», если не хотите, чтобы ваше имя сохранилось.
          </Text>

          {sent ? (
            <View style={styles.successCard}>
              <Ionicons name="checkmark-circle" size={18} color="#15803D" />
              <View style={{ flex: 1 }}>
                <Text style={styles.successTitle}>Спасибо, сообщение отправлено</Text>
                <Text style={styles.successText}>Можно отправить ещё одно, если есть что добавить.</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Сообщение</Text>
            <TextInput
              value={message}
              onChangeText={(t) => { setMessage(t.slice(0, MAX_LEN)); if (sent) setSent(false); }}
              placeholder="Поделитесь идеей, замечанием или благодарностью…"
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              style={styles.textarea}
            />
            <Text style={styles.counter}>{message.trim().length}/{MAX_LEN}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1, paddingRight: spacing.md }}>
                <Text style={styles.toggleTitle}>Отправить анонимно</Text>
                <Text style={styles.toggleHint}>
                  {anonymous
                    ? 'Имя и контакты не сохранятся — заведующая не сможет с вами связаться.'
                    : 'Заведующая увидит, кто отправил сообщение, и сможет ответить.'}
                </Text>
              </View>
              <Switch
                value={anonymous}
                onValueChange={setAnonymous}
                trackColor={{ false: '#E5E7EB', true: colors.brand }}
                thumbColor={Platform.OS === 'android' ? (anonymous ? colors.brand : '#F4F4F5') : undefined}
              />
            </View>
          </View>

          <Pressable
            onPress={submit}
            disabled={!canSend}
            style={[styles.primaryBtn, !canSend && styles.primaryBtnDisabled]}
          >
            <Ionicons name="send-outline" size={16} color={colors.textInverse} />
            <Text style={styles.primaryBtnText}>{sending ? 'Отправляем…' : 'Отправить'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxxl },
  lead: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },

  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, ...shadows.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderLight },
  sectionLabel: { fontSize: fontSize.xs, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: fontWeight.medium, marginBottom: spacing.sm },

  textarea: {
    minHeight: 160,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  counter: { textAlign: 'right', marginTop: spacing.xs, color: colors.textMuted, fontSize: fontSize.xs },

  row: { flexDirection: 'row', alignItems: 'center' },
  toggleTitle: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary },
  toggleHint: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 4, lineHeight: 17 },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, height: 48, borderRadius: 24, backgroundColor: colors.brand },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { color: colors.textInverse, fontSize: fontSize.md, fontWeight: fontWeight.medium },

  successCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: '#ECFDF5',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#A7F3D0',
  },
  successTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: '#065F46' },
  successText: { fontSize: fontSize.xs, color: '#047857', marginTop: 2 },
});
