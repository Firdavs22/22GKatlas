import { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '../lib/theme';

interface Slide { emoji: string; title: string; body: string }

const SLIDES: Record<string, Slide[]> = {
  parent: [
    { emoji: '📰', title: 'Лента группы', body: 'Здесь фотографии и новости от педагогов. Лайкайте — педагогу важна обратная связь.' },
    { emoji: '🗺', title: 'Карта развития', body: 'Три измерения: эмоции, мышление, тело. Тапните карточку — увидите все навыки и стадию каждого.' },
    { emoji: '💬', title: 'Чаты', body: 'Прямая связь с педагогом и специалистами. Только участники видят сообщения.' },
    { emoji: '⚙️', title: 'Профиль', body: 'Смена пароля, экспорт данных по 152-ФЗ, удаление аккаунта — всё через раздел «Профиль».' },
  ],
  teacher: [
    { emoji: '🎓', title: 'Дети группы', body: 'Главная — список ваших детей. Кликните по ребёнку для детальной карточки.' },
    { emoji: '📝', title: 'Дневник', body: 'Записывайте короткие наблюдения с фото. AI поможет развернуть текст из ключевых слов.' },
    { emoji: '📰', title: 'Лента', body: 'Большая «+» внизу — публикация для родителей. Фото, достижения, новости группы.' },
    { emoji: '📋', title: 'Рекомендации', body: 'Выдавайте задания для дома, родитель получит уведомление.' },
  ],
  psychologist: [
    { emoji: '👶', title: 'Дети', body: 'Список закреплённых за вами детей с наблюдениями и заметками.' },
    { emoji: '📋', title: 'Рекомендации', body: 'Назначайте задания родителям через мобильное приложение.' },
    { emoji: '📅', title: 'Слоты приёма', body: 'Расписывайте окна — родитель забронирует через своё приложение.' },
  ],
  pediatrician: [
    { emoji: '👶', title: 'Дети', body: 'Закреплённые дети с медицинскими пометками (аллергии, особенности).' },
    { emoji: '🩺', title: 'Назначения', body: 'Запись рекомендаций с настройкой видимости — себе / педагогу / родителю.' },
    { emoji: '📅', title: 'Слоты приёма', body: 'Окна для записи родителей.' },
  ],
};

export default function OnboardingModal() {
  const { user, refreshUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  const slides = user ? SLIDES[user.role] || [] : [];

  useEffect(() => {
    if (!user) return;
    if (user.role === 'admin' || user.role === 'superadmin') return;
    if (slides.length === 0) return;
    const completed = (user as any).onboardingCompletedAt;
    if (completed) return;
    setOpen(true);
    setIdx(0);
  }, [user, slides.length]);

  const finish = async () => {
    setOpen(false);
    try {
      await api.post('/me/onboarding/complete');
      await refreshUser();
    } catch { /* */ }
  };

  if (!user || slides.length === 0) return null;
  const slide = slides[idx];
  const isLast = idx === slides.length - 1;

  return (
    <Modal visible={open} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity onPress={finish} style={styles.closeBtn}>
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <Text style={styles.emoji}>{slide.emoji}</Text>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.body}>{slide.body}</Text>

          <View style={styles.dots}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === idx ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity onPress={finish} style={styles.skipBtn}>
              <Text style={styles.skipText}>Пропустить</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => (isLast ? finish() : setIdx(i => i + 1))}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryText}>
                {isLast ? 'Готово' : 'Дальше'}
              </Text>
              <Ionicons
                name={isLast ? 'checkmark' : 'arrow-forward'}
                size={14}
                color={colors.textInverse}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    width: '100%',
    maxWidth: 400,
    padding: spacing.xl,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
  },
  emoji: { fontSize: 56, marginTop: spacing.sm, marginBottom: spacing.md },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  body: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  dots: { flexDirection: 'row', gap: 6, marginBottom: spacing.lg },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 24, backgroundColor: colors.brand },
  dotInactive: { width: 6, backgroundColor: colors.borderLight },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  skipBtn: { padding: spacing.sm },
  skipText: { color: colors.textMuted, fontSize: fontSize.xs },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
  },
  primaryText: {
    color: colors.textInverse,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
