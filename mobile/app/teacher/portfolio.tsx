import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MobileShell from '../../components/MobileShell';
import AuthImage from '../../components/AuthImage';
import { Card } from '../../components/ui';
import api from '../../lib/api';
import { colors, fontSize, fontWeight, radius, shadows, spacing } from '../../lib/theme';
import type { Child } from '../../lib/types';

interface PortfolioItem {
  id: string;
  childId: string;
  type: string;
  title: string;
  description: string | null;
  fileUrl: string;
  date: string;
  childName?: string;
}

function isPhoto(item: PortfolioItem) {
  return item.type === 'photo' || /\.(png|jpe?g|webp)$/i.test(item.fileUrl);
}

export default function TeacherPortfolioScreen() {
  const [children, setChildren] = useState<Child[]>([]);
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [childFilter, setChildFilter] = useState('all');

  useEffect(() => {
    api.get('/children').then(r => setChildren(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!children.length) return;
    Promise.all(children.map(child =>
      api.get(`/children/${child.id}/portfolio`)
        .then(r => (r.data as PortfolioItem[]).map(item => ({ ...item, childName: child.name })))
        .catch(() => []),
    )).then(lists => setItems(lists.flat().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())));
  }, [children]);

  const visible = useMemo(() => childFilter === 'all' ? items : items.filter(item => item.childId === childFilter), [items, childFilter]);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Портфолио', headerTintColor: colors.brand }} />
      <MobileShell eyebrow="Работы детей" title="Портфолио">
        <View style={styles.chips}>
          <Pressable onPress={() => setChildFilter('all')} style={[styles.chip, childFilter === 'all' && styles.chipActive]}>
            <Text style={[styles.chipText, childFilter === 'all' && styles.chipTextActive]}>Все дети</Text>
          </Pressable>
          {children.map(child => (
            <Pressable key={child.id} onPress={() => setChildFilter(child.id)} style={[styles.chip, childFilter === child.id && styles.chipActive]}>
              <Text style={[styles.chipText, childFilter === child.id && styles.chipTextActive]}>{child.name}</Text>
            </Pressable>
          ))}
        </View>
        {visible.length === 0 ? (
          <Card><Text style={styles.empty}>В портфолио пока пусто</Text></Card>
        ) : (
          <View style={styles.grid}>
            {visible.map(item => (
              <Card key={item.id} padding="none" style={styles.card}>
                <View style={styles.media}>
                  {isPhoto(item) && item.fileUrl ? (
                    <AuthImage sourcePath={item.fileUrl} style={styles.image} />
                  ) : (
                    <Ionicons name={item.type === 'video' ? 'play-circle-outline' : 'document-text-outline'} size={34} color={colors.brand} />
                  )}
                </View>
                <View style={styles.content}>
                  <Text style={styles.meta}>{item.childName} · {new Date(item.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</Text>
                  <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                  {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
                </View>
              </Card>
            ))}
          </View>
        )}
      </MobileShell>
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: { height: 34, paddingHorizontal: spacing.md, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.textSecondary, fontSize: fontSize.sm },
  chipTextActive: { color: colors.textInverse },
  grid: { gap: spacing.md },
  card: { overflow: 'hidden', ...shadows.sm },
  media: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.brandPale, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  content: { padding: spacing.md },
  meta: { color: colors.textMuted, fontSize: fontSize.xs, marginBottom: spacing.xs },
  title: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  desc: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.xs },
  empty: { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xxxl },
});
