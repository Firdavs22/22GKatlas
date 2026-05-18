import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import MobileShell from '../../components/MobileShell';
import { Card, SectionLabel } from '../../components/ui';
import api from '../../lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '../../lib/theme';

type Stage = 'none' | 'presented' | 'practicing' | 'mastered';

interface Skill { id: string; title: string }
interface Area { id: string; title: string; color?: string; groups?: { skills?: Skill[] }[] }
interface ChildLite { id: string; name: string }
interface GroupProgress {
  children: ChildLite[];
  areas: Area[];
  progress: Record<string, Record<string, Stage>>;
  group?: { name?: string; ageRange?: string };
}

function stageValue(stage?: Stage) {
  if (stage === 'mastered') return 100;
  if (stage === 'practicing') return 60;
  if (stage === 'presented') return 25;
  return 0;
}

function heatColor(pct: number) {
  if (pct >= 80) return { bg: colors.success, fg: colors.textInverse };
  if (pct >= 60) return { bg: colors.successBg, fg: '#1E5731' };
  if (pct >= 35) return { bg: colors.brandPale, fg: colors.brand };
  if (pct >= 15) return { bg: colors.warnBg, fg: '#7A4A1F' };
  return { bg: colors.surfaceAlt, fg: colors.textSecondary };
}

export default function TeacherHeatmapScreen() {
  const [data, setData] = useState<GroupProgress | null>(null);

  useEffect(() => {
    api.get('/children/group-progress').then(r => setData(r.data)).catch(() => {});
  }, []);

  const matrix = useMemo(() => {
    if (!data) return [];
    return data.children.map(child => ({
      child,
      cells: data.areas.map(area => {
        let total = 0;
        let sum = 0;
        area.groups?.forEach(group => group.skills?.forEach(skill => {
          total += 1;
          sum += stageValue(data.progress[child.id]?.[skill.id]);
        }));
        return { area, pct: total ? Math.round(sum / total) : 0 };
      }),
    }));
  }, [data]);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Тепловая карта', headerTintColor: colors.brand }} />
      <MobileShell eyebrow={data?.group?.name || 'Группа'} title="Тепловая карта">
        {!data ? <Text style={styles.empty}>Загрузка...</Text> : null}
        {matrix.map(row => (
          <Card key={row.child.id} padding="md" style={styles.card}>
            <Text style={styles.childName}>{row.child.name}</Text>
            <View style={styles.cells}>
              {row.cells.map(({ area, pct }) => {
                const tone = heatColor(pct);
                return (
                  <View key={area.id} style={styles.cellWrap}>
                    <View style={[styles.cell, { backgroundColor: tone.bg }]}>
                      <Text style={[styles.cellValue, { color: tone.fg }]}>{pct}</Text>
                    </View>
                    <Text style={styles.cellLabel} numberOfLines={2}>{area.title}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        ))}
        <Card padding="md" style={styles.legend}>
          <SectionLabel>Шкала</SectionLabel>
          <Text style={styles.legendText}>0-15, 15-35, 35-60, 60-80, 80-100%</Text>
        </Card>
      </MobileShell>
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm },
  childName: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.md },
  cells: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cellWrap: { width: '30%', minWidth: 92, flexGrow: 1 },
  cell: { height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cellValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  cellLabel: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.xs },
  legend: { marginTop: spacing.lg },
  legendText: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.sm },
  empty: { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xxxl },
});
