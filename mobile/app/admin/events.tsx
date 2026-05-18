import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MobileShell from '../../components/MobileShell';
import { Badge, Button, Card } from '../../components/ui';
import api from '../../lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '../../lib/theme';

interface EventItem {
  id: string;
  title: string;
  description?: string;
  eventDate: string;
  audience?: 'all' | 'parents' | 'group' | 'staff';
}

export default function AdminEventsScreen() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/activities/events').then(r => setEvents(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!title.trim() || !eventDate.trim()) return;
    setSaving(true);
    try {
      await api.post('/activities/events', {
        title: title.trim(),
        description: description.trim(),
        eventDate,
        audience: 'all',
        mediaUrls: [],
      });
      setTitle('');
      setDescription('');
      setEventDate('');
      setFormOpen(false);
      load();
    } catch (err: any) {
      Alert.alert('События', err?.response?.data?.message || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const remove = (id: string) => {
    Alert.alert('Удалить событие?', '', [
      { text: 'Нет', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => { await api.delete(`/activities/events/${id}`); load(); } },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'События', headerTintColor: colors.brand }} />
      <MobileShell eyebrow={`Впереди: ${events.filter(e => new Date(e.eventDate) >= new Date()).length}`} title="События">
        <Button onPress={() => setFormOpen(true)} style={styles.createButton}>Добавить событие</Button>
        {events.length === 0 ? (
          <Card><Text style={styles.empty}>Пока нет запланированных событий</Text></Card>
        ) : (
          <View style={styles.stack}>
            {events.map(event => {
              const past = new Date(event.eventDate) < new Date();
              return (
                <Card key={event.id} padding="md" style={past && styles.past}>
                  <View style={styles.head}>
                    <View style={{ flex: 1 }}>
                      <Badge tone={past ? 'neutral' : 'brand'}>
                        {new Date(event.eventDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                      </Badge>
                      <Text style={styles.title}>{event.title}</Text>
                    </View>
                    <Pressable onPress={() => remove(event.id)} style={styles.deleteButton}>
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </Pressable>
                  </View>
                  {event.description ? <Text style={styles.body}>{event.description}</Text> : null}
                </Card>
              );
            })}
          </View>
        )}
      </MobileShell>

      <Modal visible={formOpen} transparent animationType="fade" onRequestClose={() => setFormOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Новое событие</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="Название" placeholderTextColor={colors.textMuted} style={styles.input} />
            <TextInput value={eventDate} onChangeText={setEventDate} placeholder="2026-05-18" placeholderTextColor={colors.textMuted} style={styles.input} />
            <TextInput value={description} onChangeText={setDescription} placeholder="Описание" placeholderTextColor={colors.textMuted} style={[styles.input, styles.textarea]} multiline />
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
  past: { opacity: 0.72 },
  head: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  deleteButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginTop: spacing.sm },
  body: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.sm },
  empty: { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xxxl },
  overlay: { flex: 1, backgroundColor: 'rgba(27,31,42,0.45)', justifyContent: 'center', padding: spacing.lg },
  modal: { backgroundColor: colors.background, borderRadius: radius.xxl, padding: spacing.xl, gap: spacing.md },
  modalTitle: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, color: colors.textPrimary, backgroundColor: colors.surface },
  textarea: { minHeight: 92, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
