import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import MobileShell from '../../components/MobileShell';
import { Card } from '../../components/ui';
import api from '../../lib/api';
import { colors, DAY_NAMES, fontSize, fontWeight, radius, spacing } from '../../lib/theme';
import type { Child, Schedule } from '../../lib/types';

export default function TeacherScheduleScreen() {
  const [group, setGroup] = useState<Child['group'] | null>(null);
  const [schedule, setSchedule] = useState<Schedule[]>([]);

  useEffect(() => {
    api.get('/children').then(r => {
      const first = r.data[0];
      setGroup(first?.group || null);
      const groupId = first?.group?.id || first?.groupId;
      if (groupId) api.get(`/groups/${groupId}/schedule`).then(s => setSchedule(s.data));
    }).catch(() => {});
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<number, Schedule[]>();
    schedule.forEach(item => {
      const list = map.get(item.dayOfWeek) || [];
      list.push(item);
      map.set(item.dayOfWeek, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a - b).map(([day, items]) => ({
      day,
      items: items.sort((a, b) => a.timeStart.localeCompare(b.timeStart)),
    }));
  }, [schedule]);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Расписание', headerTintColor: colors.brand }} />
      <MobileShell eyebrow={group?.name || 'Расписание недели'} title="Расписание">
        {byDay.length === 0 ? (
          <Card><Text style={styles.empty}>Расписание пока не задано</Text></Card>
        ) : (
          <View style={styles.stack}>
            {byDay.map(day => (
              <Card key={day.day} padding="md">
                <Text style={styles.dayTitle}>{DAY_NAMES[day.day] || `День ${day.day}`}</Text>
                {day.items.map(item => (
                  <View key={item.id} style={styles.row}>
                    <Text style={styles.time}>{item.timeStart}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activity}>{item.activity}</Text>
                      {item.description ? <Text style={styles.meta}>{item.description}</Text> : null}
                    </View>
                  </View>
                ))}
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
  dayTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
  time: { width: 52, color: colors.brand, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  activity: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  meta: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  empty: { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xxxl },
});
