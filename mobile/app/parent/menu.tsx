import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MobileShell from '../../components/MobileShell';
import { Badge, Card } from '../../components/ui';
import api from '../../lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '../../lib/theme';
import { MENU_DAY_NAMES, MENU_DAY_SHORT, parseMenuContent, type ParsedMenuMeal } from '../../lib/menu';

interface MenuItem {
  id: string;
  title: string;
  content: string;
  startDate: string;
  endDate: string;
}

const MEAL_ORDER = ['Завтрак', 'Обед', 'Полдник', 'Ужин', 'Перекус'];

function pivotByMeal(parsed: Record<string, ParsedMenuMeal[]>) {
  const grid = new Map<string, Map<string, string>>();
  const mealsSet = new Set<string>();

  for (const day of MENU_DAY_NAMES) {
    for (const meal of parsed[day] || []) {
      if (!grid.has(meal.name)) grid.set(meal.name, new Map());
      mealsSet.add(meal.name);
      grid.get(meal.name)!.set(day, [meal.food, meal.alternative].filter(Boolean).join(' / '));
    }
  }

  const mealNames = Array.from(mealsSet).sort((a, b) => {
    const ai = MEAL_ORDER.indexOf(a);
    const bi = MEAL_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return { mealNames, grid };
}

export default function ParentMenuScreen() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [showArchive, setShowArchive] = useState(false);
  const currentMenu = menus[0];
  const archive = menus.slice(1);

  useEffect(() => {
    api.get('/activities/menu').then(r => setMenus(r.data)).catch(() => {});
  }, []);

  const parsed = useMemo(() => parseMenuContent(currentMenu?.content || ''), [currentMenu]);
  const { mealNames, grid } = useMemo(() => pivotByMeal(parsed), [parsed]);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Меню', headerTintColor: colors.brand }} />
      <MobileShell eyebrow="Питание на неделю" title="Меню">
        {!currentMenu ? (
          <Card><Text style={styles.empty}>Меню еще не опубликовано</Text></Card>
        ) : mealNames.length === 0 ? (
          <Card>
            <Text style={styles.title}>{currentMenu.title}</Text>
            <Text style={styles.body}>{currentMenu.content}</Text>
          </Card>
        ) : (
          <View style={styles.stack}>
            <View style={styles.menuHeader}>
              <Text style={styles.title}>{currentMenu.title}</Text>
              <Badge tone="brand">
                {new Date(currentMenu.startDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
              </Badge>
            </View>
            {mealNames.map(meal => (
              <Card key={meal} padding="sm">
                <Text style={styles.mealTitle}>{meal}</Text>
                <View style={styles.days}>
                  {MENU_DAY_NAMES.map((day, index) => (
                    <View key={day} style={styles.dayRow}>
                      <Text style={styles.day}>{MENU_DAY_SHORT[index]}</Text>
                      <Text style={styles.food}>{grid.get(meal)?.get(day) || '—'}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            ))}
          </View>
        )}

        {archive.length > 0 ? (
          <View style={styles.archive}>
            <Pressable style={styles.archiveToggle} onPress={() => setShowArchive(v => !v)}>
              <Text style={styles.archiveTitle}>Архив меню</Text>
              <Ionicons name={showArchive ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
            </Pressable>
            {showArchive ? archive.map(m => (
              <Card key={m.id} padding="sm" style={styles.archiveCard}>
                <Text style={styles.archiveItem}>{m.title}</Text>
                <Text style={styles.meta}>
                  {new Date(m.startDate).toLocaleDateString('ru-RU')} - {new Date(m.endDate).toLocaleDateString('ru-RU')}
                </Text>
                <Text style={styles.body}>{m.content}</Text>
              </Card>
            )) : null}
          </View>
        ) : null}
      </MobileShell>
    </>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
  menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  title: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  mealTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
  days: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
  dayRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
  day: { width: 28, color: colors.brand, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  food: { flex: 1, color: colors.textPrimary, fontSize: fontSize.sm, lineHeight: 19 },
  body: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.sm },
  empty: { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xxxl },
  archive: { marginTop: spacing.xl },
  archiveToggle: { height: 44, paddingHorizontal: spacing.lg, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  archiveTitle: { color: colors.textPrimary, fontWeight: fontWeight.medium },
  archiveCard: { marginTop: spacing.sm },
  archiveItem: { color: colors.textPrimary, fontWeight: fontWeight.medium },
  meta: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
});
