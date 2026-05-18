import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MobileShell from '../../components/MobileShell';
import PostMedia from '../../components/PostMedia';
import { Badge, Card, Button } from '../../components/ui';
import api from '../../lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '../../lib/theme';
import type { Child, Observation } from '../../lib/types';

type ObservationWithChild = Observation & { childName?: string };

export default function TeacherDiaryScreen() {
  const [children, setChildren] = useState<Child[]>([]);
  const [items, setItems] = useState<ObservationWithChild[]>([]);
  const [childFilter, setChildFilter] = useState('all');

  useEffect(() => {
    api.get('/children').then(r => setChildren(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!children.length) return;
    Promise.all(children.map(child =>
      api.get(`/children/${child.id}/observations`)
        .then(r => (r.data as Observation[]).map(item => ({ ...item, childName: child.name })))
        .catch(() => []),
    )).then(lists => setItems(lists.flat().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())));
  }, [children]);

  const visible = useMemo(() => childFilter === 'all' ? items : items.filter(item => item.childId === childFilter), [items, childFilter]);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Дневник', headerTintColor: colors.brand }} />
      <MobileShell eyebrow="Наблюдения за детьми" title="Дневник">
        <Button onPress={() => router.push('/new-post')} style={styles.createButton}>Новый пост</Button>
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
          <Card><Text style={styles.empty}>Записей пока нет</Text></Card>
        ) : (
          <View style={styles.stack}>
            {visible.map(item => (
              <Card key={item.id} padding="md">
                <View style={styles.head}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(item.childName || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{item.childName}</Text>
                    <Text style={styles.meta}>{new Date(item.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</Text>
                  </View>
                  <Badge tone={item.visible ? 'success' : 'neutral'}>{item.visible ? 'видно' : 'личное'}</Badge>
                </View>
                <Text style={styles.body}>{item.text}</Text>
                <PostMedia urls={item.photos || []} compact />
              </Card>
            ))}
          </View>
        )}
      </MobileShell>
    </>
  );
}

const styles = StyleSheet.create({
  createButton: { marginBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: { height: 34, paddingHorizontal: spacing.md, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.textSecondary, fontSize: fontSize.sm },
  chipTextActive: { color: colors.textInverse },
  stack: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.brandPale, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.brand, fontWeight: fontWeight.bold },
  title: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  meta: { color: colors.textMuted, fontSize: fontSize.xs },
  body: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 21 },
  empty: { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xxxl },
});
