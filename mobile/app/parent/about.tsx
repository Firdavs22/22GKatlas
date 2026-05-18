import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import MobileShell from '../../components/MobileShell';
import { Card, SectionLabel } from '../../components/ui';
import api from '../../lib/api';
import { colors, fontSize, fontWeight, spacing } from '../../lib/theme';

interface ZoneItem {
  n: string;
  title: string;
  desc: string;
  accent: string;
}

interface StageItem {
  label: string;
  desc: string;
}

interface AboutContent {
  intro: string;
  zones: ZoneItem[];
  stages: StageItem[];
}

const DEFAULT_ABOUT: AboutContent = {
  intro: 'Среда устроена так, чтобы ребенок мог сам выбирать материал, работать в своем темпе и осваивать навыки в естественной последовательности. Педагог - наблюдатель и проводник.',
  zones: [
    { n: '01', title: 'Практическая жизнь', desc: 'Уход за собой, уход за средой, контроль движений. Основа всего - формирует независимость и концентрацию.', accent: colors.success },
    { n: '02', title: 'Сенсорика', desc: 'Размер, форма, цвет, текстура, запах, звук. Материалы изолируют по одному признаку.', accent: colors.success },
    { n: '03', title: 'Математика', desc: 'Конкретное к абстрактному: штанги, веретена, золотой материал, бусины.', accent: colors.brandSoft },
    { n: '04', title: 'Язык', desc: 'Обогащение словаря, шероховатые буквы, подвижный алфавит, чтение и письмо.', accent: colors.warn },
    { n: '05', title: 'Космос', desc: 'Природа, география, история, биология. Ребенок учится понимать мир и свое место в нем.', accent: colors.danger },
  ],
  stages: [
    { label: 'Не начат', desc: 'Презентация еще не проводилась.' },
    { label: 'Знакомство', desc: 'Педагог провел первое знакомство с материалом.' },
    { label: 'Повторение', desc: 'Ребенок практикуется самостоятельно.' },
    { label: 'Усвоено', desc: 'Уверенно демонстрирует навык в работе.' },
  ],
};

export default function ParentAboutScreen() {
  const [about, setAbout] = useState(DEFAULT_ABOUT);

  useEffect(() => {
    api.get('/site-content/about').then(r => {
      const data = r.data;
      if (!data) return;
      setAbout({
        intro: data.intro || DEFAULT_ABOUT.intro,
        zones: Array.isArray(data.zones) && data.zones.length ? data.zones : DEFAULT_ABOUT.zones,
        stages: Array.isArray(data.stages) && data.stages.length ? data.stages : DEFAULT_ABOUT.stages,
      });
    }).catch(() => {});
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'О системе', headerTintColor: colors.brand }} />
      <MobileShell eyebrow="Принципы и зоны развития" title="О нашей системе">
        <Text style={styles.intro}>{about.intro}</Text>
        <View style={styles.stack}>
          {about.zones.map(zone => (
            <Card key={zone.n} padding="md">
              <Text style={[styles.zoneNumber, { color: zone.accent || colors.brandSoft }]}>{zone.n}</Text>
              <Text style={styles.kicker}>Зона {zone.n}</Text>
              <Text style={styles.title}>{zone.title}</Text>
              <Text style={styles.body}>{zone.desc}</Text>
            </Card>
          ))}
        </View>
        <View style={styles.stageHeader}>
          <SectionLabel>Стадии освоения навыка</SectionLabel>
          <Text style={styles.stageTitle}>Как мы видим прогресс</Text>
        </View>
        <View style={styles.stack}>
          {about.stages.map((stage, index) => (
            <Card key={`${stage.label}-${index}`} padding="md">
              <Text style={styles.kicker}>Стадия {index + 1}</Text>
              <Text style={styles.title}>{stage.label}</Text>
              <Text style={styles.body}>{stage.desc}</Text>
            </Card>
          ))}
        </View>
      </MobileShell>
    </>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.textSecondary, fontSize: fontSize.lg, lineHeight: 26, marginBottom: spacing.xl },
  stack: { gap: spacing.sm },
  zoneNumber: { position: 'absolute', right: spacing.lg, top: spacing.md, fontSize: 44, fontWeight: fontWeight.bold, opacity: 0.25 },
  kicker: { color: colors.textMuted, fontSize: fontSize.xs, textTransform: 'uppercase', fontWeight: fontWeight.medium, marginBottom: spacing.xs },
  title: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
  body: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20 },
  stageHeader: { marginTop: spacing.xxl, marginBottom: spacing.md },
  stageTitle: { color: colors.textPrimary, fontSize: fontSize.xxl, fontWeight: fontWeight.bold, marginTop: spacing.xs },
});
