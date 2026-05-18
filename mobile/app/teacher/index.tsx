import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MobileShell from '../../components/MobileShell';
import NavList from '../../components/NavList';
import api from '../../lib/api';
import { ROLE_NAV } from '../../lib/navigation';
import { colors, fontSize, fontWeight, radius, shadows, spacing } from '../../lib/theme';
import type { Child } from '../../lib/types';

export default function TeacherChildrenScreen() {
  const [children, setChildren] = useState<Child[]>([]);

  useEffect(() => {
    api.get('/children').then(r => setChildren(r.data)).catch(() => {});
  }, []);

  const group = children[0]?.group;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Дети', headerTintColor: colors.brand }} />
      <MobileShell eyebrow={group?.name || 'Группа'} title="Дети группы">
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>{group?.ageRange || 'Матрица и дневник'}</Text>
          <Text style={styles.heroTitle}>{children.length} детей</Text>
        </View>
        <NavList items={ROLE_NAV.teacher.filter(item => item.href && item.href !== '/teacher/index')} />
        <Text style={styles.sectionTitle}>Список детей</Text>
        {children.map(child => (
          <Pressable key={child.id} style={styles.row} onPress={() => router.push(`/child/${child.id}`)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{child.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={1}>{child.name}</Text>
              <Text style={styles.meta} numberOfLines={1}>{child.group?.name || 'Группа'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
      </MobileShell>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.brand, borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.lg, ...shadows.md },
  heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.sm },
  heroTitle: { color: colors.textInverse, fontSize: fontSize.xxxl, fontWeight: fontWeight.bold, marginTop: spacing.xs },
  sectionTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginTop: spacing.xl, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderLight, ...shadows.sm },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brandPale, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.brand, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  name: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  meta: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
});
