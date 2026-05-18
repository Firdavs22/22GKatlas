import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MobileShell from '../../components/MobileShell';
import { Card } from '../../components/ui';
import api, { API_URL } from '../../lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '../../lib/theme';
import type { Child, Observation } from '../../lib/types';

function mediaUrl(url: string) {
  return url.startsWith('http') ? url : `${API_URL}${url}`;
}

export default function ParentDiaryScreen() {
  const [children, setChildren] = useState<Child[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [childId, setChildId] = useState('');

  useEffect(() => {
    api.get('/children').then(r => {
      setChildren(r.data);
      if (r.data[0]) setChildId(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!childId) return;
    api.get(`/children/${childId}/observations`).then(r => setObservations(r.data));
  }, [childId]);

  const sorted = useMemo(
    () => [...observations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [observations],
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Дневник', headerTintColor: colors.brand }} />
      <MobileShell eyebrow="Записи от педагогов" title="Дневник наблюдений">
        {children.length > 1 ? (
          <View style={styles.childTabs}>
            {children.map(child => (
              <Pressable key={child.id} onPress={() => setChildId(child.id)} style={[styles.childTab, child.id === childId && styles.childTabActive]}>
                <Text style={[styles.childText, child.id === childId && styles.childTextActive]}>{child.name}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {sorted.length === 0 ? (
          <Card><Text style={styles.empty}>Записи еще не появились</Text></Card>
        ) : (
          <View style={styles.stack}>
            {sorted.map(item => (
              <Card key={item.id} padding="md">
                <View style={styles.rowTop}>
                  <View style={styles.iconBox}>
                    <Ionicons name="calendar-outline" size={18} color={colors.brand} />
                  </View>
                  <View style={styles.flex}>
                    <View style={styles.metaLine}>
                      <Text style={styles.kicker}>
                        {new Date(item.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </Text>
                      {item.author?.name ? <Text style={styles.author}>{item.author.name}</Text> : null}
                    </View>
                    <Text style={styles.body}>{item.text}</Text>
                    {item.photos?.length ? (
                      <View style={styles.photos}>
                        {item.photos.slice(0, 4).map(photo => (
                          <Image key={photo} source={{ uri: mediaUrl(photo) }} style={styles.photo} />
                        ))}
                      </View>
                    ) : null}
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
  childTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  childTab: { height: 36, paddingHorizontal: spacing.lg, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  childTabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  childText: { color: colors.textSecondary, fontSize: fontSize.sm },
  childTextActive: { color: colors.textInverse },
  stack: { gap: spacing.sm },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  iconBox: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.brandPale, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  metaLine: { gap: 2, marginBottom: spacing.sm },
  kicker: { color: colors.textMuted, fontSize: fontSize.xs, textTransform: 'uppercase', fontWeight: fontWeight.medium },
  author: { color: colors.textSecondary, fontSize: fontSize.xs },
  body: { color: colors.textPrimary, fontSize: fontSize.sm, lineHeight: 21 },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  photo: { width: 82, height: 82, borderRadius: radius.md, backgroundColor: colors.brandPale },
  empty: { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xxxl },
});
