import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MobileShell from '../../../../components/MobileShell';
import { Card, SectionLabel } from '../../../../components/ui';
import api from '../../../../lib/api';
import { colors, fontSize, fontWeight, radius, spacing, STAGE_CONFIG } from '../../../../lib/theme';

type DimensionKey = 'emotion' | 'cognition' | 'body';

interface ChildLite {
  id: string;
  name: string;
}

interface SkillRow {
  id: string;
  title: string;
  description: string | null;
  group_title: string;
  zone_title: string;
  zone_color: string | null;
  stage: 'none' | 'presented' | 'practicing' | 'mastered';
  updated_at: string | null;
}

const META: Record<DimensionKey, { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; accent: string }> = {
  emotion: {
    title: 'Эмоции и общение',
    subtitle: 'Самостоятельность, забота, сотрудничество и взаимодействие.',
    icon: 'heart-outline',
    accent: '#993556',
  },
  cognition: {
    title: 'Мышление и память',
    subtitle: 'Концентрация, логика, восприятие, речь и счет.',
    icon: 'bulb-outline',
    accent: '#534AB7',
  },
  body: {
    title: 'Тело и движение',
    subtitle: 'Мелкая и крупная моторика, координация и контроль движений.',
    icon: 'fitness-outline',
    accent: '#0F6E56',
  },
};

function asDimension(value?: string): DimensionKey | null {
  return value === 'emotion' || value === 'cognition' || value === 'body' ? value : null;
}

export default function DimensionDetailScreen() {
  const params = useLocalSearchParams<{ key: string }>();
  const dimension = asDimension(params.key);
  const [child, setChild] = useState<ChildLite | null>(null);
  const [skills, setSkills] = useState<SkillRow[]>([]);

  useEffect(() => {
    api.get('/children').then(r => setChild((r.data || [])[0] || null));
  }, []);

  useEffect(() => {
    if (!child || !dimension) return;
    api.get(`/children/${child.id}/dimension/${dimension}`).then(r => setSkills(r.data || []));
  }, [child, dimension]);

  const grouped = useMemo(() => {
    const byZone = new Map<string, { color: string | null; groups: Map<string, SkillRow[]> }>();
    for (const skill of skills) {
      const zoneKey = skill.zone_title || 'Без зоны';
      let zone = byZone.get(zoneKey);
      if (!zone) {
        zone = { color: skill.zone_color, groups: new Map() };
        byZone.set(zoneKey, zone);
      }
      const groupKey = skill.group_title || 'Навыки';
      const group = zone.groups.get(groupKey) || [];
      group.push(skill);
      zone.groups.set(groupKey, group);
    }
    return Array.from(byZone.entries()).map(([zone, value]) => ({
      zone,
      color: value.color,
      groups: Array.from(value.groups.entries()).map(([title, list]) => ({ title, skills: list })),
    }));
  }, [skills]);

  const meta = dimension ? META[dimension] : null;
  const mastered = skills.filter(skill => skill.stage === 'mastered').length;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: meta?.title || 'Измерение', headerTintColor: colors.brand }} />
      <MobileShell eyebrow={child?.name || 'Карта развития'} title={meta?.title || 'Не найдено'}>
        {!dimension || !meta ? (
          <Card><Text style={styles.empty}>Неизвестное измерение</Text></Card>
        ) : (
          <>
            <Card padding="md" style={styles.summary}>
              <View style={[styles.iconBox, { backgroundColor: meta.accent }]}>
                <Ionicons name={meta.icon} size={22} color={colors.textInverse} />
              </View>
              <View style={styles.summaryText}>
                <SectionLabel>Измерение развития</SectionLabel>
                <Text style={styles.summaryTitle}>{meta.title}</Text>
                <Text style={styles.summaryBody}>{meta.subtitle}</Text>
                <Text style={styles.summaryMeta}>Освоено {mastered} из {skills.length} навыков</Text>
              </View>
            </Card>

            {grouped.length === 0 ? (
              <Card><Text style={styles.empty}>Навыков в этом измерении пока нет</Text></Card>
            ) : (
              <View style={styles.stack}>
                {grouped.map(zone => (
                  <Card key={zone.zone} padding="md">
                    <View style={styles.zoneHead}>
                      <View style={[styles.zoneDot, { backgroundColor: zone.color || colors.brand }]} />
                      <SectionLabel>{zone.zone}</SectionLabel>
                    </View>
                    {zone.groups.map(group => (
                      <View key={group.title} style={styles.group}>
                        <Text style={styles.groupTitle}>{group.title}</Text>
                        {group.skills.map(skill => {
                          const stage = STAGE_CONFIG[skill.stage];
                          return (
                            <View key={skill.id} style={styles.skillRow}>
                              <View style={[styles.stageDot, { backgroundColor: stage.bg, borderColor: colors.stageNoneBorder }]} />
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={styles.skillTitle} numberOfLines={2}>{skill.title}</Text>
                                {skill.description ? <Text style={styles.skillDesc} numberOfLines={2}>{skill.description}</Text> : null}
                              </View>
                              <Text style={[styles.stageLabel, { color: stage.text }]}>{stage.label}</Text>
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </Card>
                ))}
              </View>
            )}
          </>
        )}
      </MobileShell>
    </>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  iconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  summaryText: { flex: 1, minWidth: 0 },
  summaryTitle: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginTop: spacing.xs },
  summaryBody: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.xs },
  summaryMeta: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.sm },
  stack: { gap: spacing.sm },
  zoneHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  zoneDot: { width: 10, height: 10, borderRadius: 5 },
  group: { marginTop: spacing.md },
  groupTitle: { color: colors.textSecondary, fontSize: fontSize.xs, textTransform: 'uppercase', fontWeight: fontWeight.medium, marginBottom: spacing.sm },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
  stageDot: { width: 12, height: 12, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth },
  skillTitle: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  skillDesc: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
  stageLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  empty: { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xxxl },
});
