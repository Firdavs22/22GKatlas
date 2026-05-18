import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MobileShell from './MobileShell';
import { Card } from './ui';
import api from '../lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '../lib/theme';

type Kind = 'groups' | 'children' | 'staff';

const CONFIG: Record<Kind, { title: string; eyebrow: string; endpoint: string; icon: keyof typeof Ionicons.glyphMap }> = {
  groups: { title: 'Группы', eyebrow: 'Администрирование', endpoint: '/admin/groups', icon: 'people-outline' },
  children: { title: 'Дети', eyebrow: 'Администрирование', endpoint: '/admin/children', icon: 'school-outline' },
  staff: { title: 'Сотрудники', eyebrow: 'Администрирование', endpoint: '/admin/staff', icon: 'briefcase-outline' },
};

export default function AdminListScreen({ kind }: { kind: Kind }) {
  const [items, setItems] = useState<any[]>([]);
  const cfg = CONFIG[kind];

  useEffect(() => {
    api.get(cfg.endpoint).then(r => setItems(r.data)).catch(() => {});
  }, [cfg.endpoint]);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: cfg.title, headerTintColor: colors.brand }} />
      <MobileShell eyebrow={`${cfg.eyebrow} · ${items.length}`} title={cfg.title}>
        {items.length === 0 ? (
          <Card><Text style={styles.empty}>Данных пока нет</Text></Card>
        ) : (
          <View style={styles.stack}>
            {items.map(item => (
              <Card key={item.id} padding="md">
                <View style={styles.row}>
                  <View style={styles.iconBox}>
                    <Ionicons name={cfg.icon} size={18} color={colors.brand} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.title} numberOfLines={1}>{item.name || item.email || item.title || 'Запись'}</Text>
                    <Text style={styles.meta} numberOfLines={2}>
                      {kind === 'groups'
                        ? [item.ageRange, item.year, item.teacher?.name, `${item._count?.children ?? 0} детей`].filter(Boolean).join(' · ')
                        : kind === 'children'
                          ? [item.group?.name, item.status, item.birthDate ? new Date(item.birthDate).toLocaleDateString('ru-RU') : ''].filter(Boolean).join(' · ')
                          : [item.email, item.role].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
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
  stack: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBox: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.brandPale, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  meta: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  empty: { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xxxl },
});
