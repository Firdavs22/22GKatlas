import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MobileShell from '../../components/MobileShell';
import { Badge, Card } from '../../components/ui';
import api from '../../lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '../../lib/theme';
import type { Child } from '../../lib/types';

interface HomeTask {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'done';
  updatedAt: string;
  skill?: { id: string; title: string };
  dueDate?: string;
  author?: { name: string };
  authorRole?: string;
  tags?: string[];
}

const ROLE_LABEL: Record<string, string> = {
  teacher: 'Педагог',
  pediatrician: 'Педиатр',
  psychologist: 'Психолог',
  admin: 'Администрация',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export default function ParentHomeTasksScreen() {
  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState('');
  const [tasks, setTasks] = useState<HomeTask[]>([]);

  useEffect(() => {
    api.get('/children').then(r => {
      setChildren(r.data);
      if (r.data[0]) setChildId(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!childId) return;
    api.get(`/children/${childId}/home-tasks`).then(r => setTasks(r.data));
  }, [childId]);

  const toggle = async (task: HomeTask) => {
    const next = task.status === 'done' ? 'pending' : 'done';
    await api.put(`/children/${childId}/home-tasks/${task.id}`, { completed: next === 'done' });
    setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, status: next } : t)));
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Рекомендации', headerTintColor: colors.brand }} />
      <MobileShell eyebrow="От педагогов и специалистов" title="Рекомендации">
        {children.length > 1 ? (
          <View style={styles.childTabs}>
            {children.map(child => (
              <Pressable key={child.id} onPress={() => setChildId(child.id)} style={[styles.childTab, child.id === childId && styles.childTabActive]}>
                <Text style={[styles.childTabText, child.id === childId && styles.childTabTextActive]}>{child.name}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {tasks.length === 0 ? (
          <Card><Text style={styles.empty}>Рекомендаций пока нет</Text></Card>
        ) : (
          <View style={styles.stack}>
            {tasks.map(task => {
              const done = task.status === 'done';
              const important = (task.tags || []).some(tag => /важно|важн/i.test(tag));
              return (
                <Pressable key={task.id} onPress={() => toggle(task)}>
                  <Card padding="md" style={[done && styles.doneCard, important && styles.importantCard]}>
                    <View style={styles.cardHead}>
                      <View style={styles.badges}>
                        {important ? <Badge tone="danger">важно</Badge> : null}
                        {task.skill?.title ? <Badge tone="brand">{task.skill.title}</Badge> : null}
                      </View>
                      <Badge tone={done ? 'success' : 'warn'} dot>{done ? 'выполнено' : 'в работе'}</Badge>
                    </View>
                    <Text style={[styles.title, done && styles.doneText]}>{task.title}</Text>
                    {task.description ? <Text style={styles.body}>{task.description}</Text> : null}
                    <View style={styles.footer}>
                      <Text style={styles.meta}>{task.author?.name || ROLE_LABEL[task.authorRole || ''] || 'Сотрудник'}</Text>
                      <Text style={styles.meta}>{task.dueDate ? `до ${formatDate(task.dueDate)}` : formatDate(task.updatedAt)}</Text>
                    </View>
                    <View style={styles.tapHint}>
                      <Ionicons name={done ? 'refresh-outline' : 'checkmark-circle-outline'} size={16} color={colors.brand} />
                      <Text style={styles.tapHintText}>{done ? 'Вернуть в работу' : 'Отметить выполненным'}</Text>
                    </View>
                  </Card>
                </Pressable>
              );
            })}
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
  childTabText: { color: colors.textSecondary, fontSize: fontSize.sm },
  childTabTextActive: { color: colors.textInverse, fontWeight: fontWeight.medium },
  stack: { gap: spacing.sm },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  badges: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  importantCard: { borderColor: colors.danger },
  doneCard: { opacity: 0.72 },
  title: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  doneText: { textDecorationLine: 'line-through', color: colors.textSecondary },
  body: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
  meta: { color: colors.textMuted, fontSize: fontSize.xs, flexShrink: 1 },
  tapHint: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center', marginTop: spacing.md },
  tapHintText: { color: colors.brand, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  empty: { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xxxl },
});
