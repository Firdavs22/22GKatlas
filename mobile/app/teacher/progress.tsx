import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import MobileShell from '../../components/MobileShell';
import { Card } from '../../components/ui';
import api from '../../lib/api';
import { colors, fontSize, fontWeight, radius, spacing, STAGE_CONFIG } from '../../lib/theme';

type Stage = 'none' | 'presented' | 'practicing' | 'mastered';

interface Skill { id: string; title: string }
interface SkillGroup { id: string; title: string; skills?: Skill[] }
interface Area { id: string; title: string; color?: string; groups?: SkillGroup[] }
interface ChildLite { id: string; name: string }
interface GroupProgress {
  children: ChildLite[];
  areas: Area[];
  progress: Record<string, Record<string, Stage>>;
  group?: { name?: string; ageRange?: string };
}

const NEXT_STAGE: Record<Stage, Stage> = {
  none: 'presented',
  presented: 'practicing',
  practicing: 'mastered',
  mastered: 'none',
};

export default function TeacherProgressScreen() {
  const [data, setData] = useState<GroupProgress | null>(null);
  const [childId, setChildId] = useState('');

  useEffect(() => {
    api.get('/children/group-progress').then(r => {
      setData(r.data);
      if (r.data.children?.[0]) setChildId(r.data.children[0].id);
    }).catch(() => {});
  }, []);

  const child = useMemo(() => data?.children.find(item => item.id === childId), [data, childId]);

  const setStage = async (skillId: string, stage: Stage) => {
    if (!data || !childId) return;
    const next = NEXT_STAGE[stage];
    setData(prev => prev ? ({
      ...prev,
      progress: {
        ...prev.progress,
        [childId]: { ...prev.progress[childId], [skillId]: next },
      },
    }) : prev);
    try {
      await api.put(`/children/${childId}/progress`, { skillId, stage: next });
    } catch {
      Alert.alert('Матрица прогресса', 'Не удалось сохранить стадию');
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Матрица', headerTintColor: colors.brand }} />
      <MobileShell eyebrow={data?.group?.name || 'Группа'} title="Матрица прогресса">
        {!data ? <Text style={styles.empty}>Загрузка...</Text> : null}
        {data ? (
          <>
            <View style={styles.chips}>
              {data.children.map(item => (
                <Pressable key={item.id} onPress={() => setChildId(item.id)} style={[styles.chip, childId === item.id && styles.chipActive]}>
                  <Text style={[styles.chipText, childId === item.id && styles.chipTextActive]}>{item.name}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.childTitle}>{child?.name}</Text>
            <View style={styles.stack}>
              {data.areas.map(area => (
                <Card key={area.id} padding="md">
                  <View style={styles.areaHead}>
                    <View style={[styles.areaDot, { backgroundColor: area.color || colors.brand }]} />
                    <Text style={styles.areaTitle}>{area.title}</Text>
                  </View>
                  {area.groups?.map(group => (
                    <View key={group.id} style={styles.group}>
                      <Text style={styles.groupTitle}>{group.title}</Text>
                      {group.skills?.map(skill => {
                        const stage = data.progress[childId]?.[skill.id] || 'none';
                        const cfg = STAGE_CONFIG[stage];
                        return (
                          <Pressable key={skill.id} style={styles.skillRow} onPress={() => setStage(skill.id, stage)}>
                            <View style={[styles.stageDot, { backgroundColor: cfg.bg, borderColor: colors.stageNoneBorder }]} />
                            <Text style={styles.skillTitle}>{skill.title}</Text>
                            <Text style={[styles.stageText, { color: cfg.text }]}>{cfg.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </Card>
              ))}
            </View>
          </>
        ) : null}
      </MobileShell>
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: { minHeight: 34, paddingHorizontal: spacing.md, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.textSecondary, fontSize: fontSize.sm },
  chipTextActive: { color: colors.textInverse },
  childTitle: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginBottom: spacing.md },
  stack: { gap: spacing.sm },
  areaHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  areaDot: { width: 10, height: 10, borderRadius: 5 },
  areaTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  group: { marginTop: spacing.md },
  groupTitle: { color: colors.textSecondary, fontSize: fontSize.xs, textTransform: 'uppercase', fontWeight: fontWeight.medium, marginBottom: spacing.sm },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
  stageDot: { width: 13, height: 13, borderRadius: 7, borderWidth: StyleSheet.hairlineWidth },
  skillTitle: { flex: 1, color: colors.textPrimary, fontSize: fontSize.sm },
  stageText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  empty: { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xxxl },
});
