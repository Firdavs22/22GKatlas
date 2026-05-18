import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MobileShell from '../../components/MobileShell';
import { Badge, Button, Card } from '../../components/ui';
import api from '../../lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '../../lib/theme';
import type { Child } from '../../lib/types';

interface Recommendation {
  id: string;
  childId: string;
  title: string;
  description: string | null;
  tags?: string[];
  status: 'pending' | 'done';
  updatedAt: string;
  skill?: { id: string; title: string } | null;
  childName?: string;
}

const TAGS = ['Дом. практика', 'Презентация', 'Внимание'];

export default function TeacherHomeTasksScreen() {
  const [children, setChildren] = useState<Child[]>([]);
  const [tasks, setTasks] = useState<Recommendation[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [childId, setChildId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/children').then(r => {
      setChildren(r.data);
      if (r.data[0]) setChildId(r.data[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!children.length) return;
    Promise.all(children.map(child =>
      api.get(`/children/${child.id}/home-tasks`)
        .then(r => (r.data as Recommendation[]).map(item => ({ ...item, childName: child.name })))
        .catch(() => []),
    )).then(lists => setTasks(lists.flat().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())));
  }, [children]);

  const selectedChild = useMemo(() => children.find(child => child.id === childId), [children, childId]);

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(item => item !== tag) : [...prev, tag]);
  };

  const submit = async () => {
    if (!childId || !title.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.post(`/children/${childId}/home-tasks`, {
        title: title.trim(),
        description: description.trim() || null,
        tags,
      });
      setTasks(prev => [{ ...data, childName: selectedChild?.name }, ...prev]);
      setTitle('');
      setDescription('');
      setTags([]);
      setFormOpen(false);
    } catch (err: any) {
      Alert.alert('Рекомендации', err?.response?.data?.message || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const remove = (task: Recommendation) => {
    Alert.alert('Удалить рекомендацию?', '', [
      { text: 'Нет', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/children/${task.childId}/home-tasks/${task.id}`);
          setTasks(prev => prev.filter(item => item.id !== task.id));
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Рекомендации', headerTintColor: colors.brand }} />
      <MobileShell eyebrow="Для родителей группы" title="Рекомендации">
        <Button onPress={() => setFormOpen(true)} style={styles.createButton}>Новая рекомендация</Button>
        {tasks.length === 0 ? (
          <Card><Text style={styles.empty}>Активных рекомендаций пока нет</Text></Card>
        ) : (
          <View style={styles.stack}>
            {tasks.map(task => (
              <Card key={task.id} padding="md">
                <View style={styles.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.meta}>{task.childName} · {new Date(task.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</Text>
                    <Text style={styles.title}>{task.title}</Text>
                  </View>
                  <Pressable onPress={() => remove(task)} style={styles.deleteButton}>
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </Pressable>
                </View>
                {task.description ? <Text style={styles.body}>{task.description}</Text> : null}
                <View style={styles.badges}>
                  <Badge tone={task.status === 'done' ? 'success' : 'warn'} dot>{task.status === 'done' ? 'выполнено' : 'в работе'}</Badge>
                  {task.skill?.title ? <Badge tone="brand">{task.skill.title}</Badge> : null}
                  {task.tags?.map(tag => <Badge key={tag} tone={/важно|важн/i.test(tag) ? 'danger' : 'neutral'}>{tag}</Badge>)}
                </View>
              </Card>
            ))}
          </View>
        )}
      </MobileShell>

      <Modal visible={formOpen} transparent animationType="fade" onRequestClose={() => setFormOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Новая рекомендация</Text>
            <View style={styles.chips}>
              {children.map(child => (
                <Pressable key={child.id} onPress={() => setChildId(child.id)} style={[styles.chip, childId === child.id && styles.chipActive]}>
                  <Text style={[styles.chipText, childId === child.id && styles.chipTextActive]}>{child.name}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput value={title} onChangeText={setTitle} placeholder="Заголовок" placeholderTextColor={colors.textMuted} style={styles.input} />
            <TextInput value={description} onChangeText={setDescription} placeholder="Описание" placeholderTextColor={colors.textMuted} style={[styles.input, styles.textarea]} multiline />
            <View style={styles.chips}>
              {TAGS.map(tag => (
                <Pressable key={tag} onPress={() => toggleTag(tag)} style={[styles.chip, tags.includes(tag) && styles.chipActive]}>
                  <Text style={[styles.chipText, tags.includes(tag) && styles.chipTextActive]}>{tag}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.actions}>
              <Button onPress={submit} loading={saving}>Опубликовать</Button>
              <Button onPress={() => setFormOpen(false)} variant="outline">Отмена</Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  createButton: { marginBottom: spacing.md },
  stack: { gap: spacing.sm },
  cardHead: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  deleteButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginTop: spacing.xs },
  meta: { color: colors.textMuted, fontSize: fontSize.xs },
  body: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
  empty: { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xxxl },
  overlay: { flex: 1, backgroundColor: 'rgba(27,31,42,0.45)', justifyContent: 'center', padding: spacing.lg },
  modal: { backgroundColor: colors.background, borderRadius: radius.xxl, padding: spacing.xl, gap: spacing.md },
  modalTitle: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 34, paddingHorizontal: spacing.md, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.textSecondary, fontSize: fontSize.sm },
  chipTextActive: { color: colors.textInverse },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, color: colors.textPrimary, backgroundColor: colors.surface },
  textarea: { minHeight: 92, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
