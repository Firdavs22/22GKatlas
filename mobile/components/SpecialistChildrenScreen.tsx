import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MobileShell from './MobileShell';
import { Card } from './ui';
import api from '../lib/api';
import { colors, fontSize, fontWeight, radius, shadows, spacing } from '../lib/theme';
import type { Child, Role } from '../lib/types';

interface Props {
  role: Extract<Role, 'psychologist' | 'pediatrician'>;
}

function ageLabel(birthDate: string) {
  const today = new Date();
  const b = new Date(birthDate);
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return `${age} лет`;
}

export default function SpecialistChildrenScreen({ role }: Props) {
  const [children, setChildren] = useState<Child[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/children').then(r => setChildren(r.data)).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? children.filter(child => child.name.toLowerCase().includes(q)) : children;
  }, [children, search]);

  const isDoctor = role === 'pediatrician';

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: isDoctor ? 'Пациенты' : 'Подопечные', headerTintColor: colors.brand }} />
      <MobileShell eyebrow={`${filtered.length} из ${children.length}`} title={isDoctor ? 'Мои пациенты' : 'Мои подопечные'}>
        <Card padding="sm" style={styles.searchCard}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Имя ребенка"
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
            />
          </View>
        </Card>
        {filtered.length === 0 ? (
          <Card><Text style={styles.empty}>{children.length === 0 ? 'Нет назначенных детей' : 'Никого не найдено'}</Text></Card>
        ) : (
          filtered.map(child => (
            <Pressable key={child.id} style={styles.row} onPress={() => router.push(`/child/${child.id}`)}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{child.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={1}>{child.name}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {child.group?.name || 'Без группы'} · {ageLabel(child.birthDate)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))
        )}
      </MobileShell>
    </>
  );
}

const styles = StyleSheet.create({
  searchCard: { marginBottom: spacing.lg },
  searchBox: { height: 42, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: fontSize.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderLight, ...shadows.sm },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brandPale, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.brand, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  name: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  meta: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  empty: { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xxxl },
});
