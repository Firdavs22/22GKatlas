import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MobileShell from './MobileShell';
import { Badge, Button, Card } from './ui';
import api from '../lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '../lib/theme';

interface Slot {
  id: string;
  startsAt: string;
  endsAt: string;
  location?: string | null;
  notes?: string | null;
  bookings?: { id: string; topic?: string | null; status: string }[];
}

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function SpecialistSlotsScreen() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get('/appointments/slots/mine').then(r => setSlots(r.data)).catch(() => {});
  };

  useEffect(() => {
    load();
    const start = new Date(Date.now() + 24 * 3600 * 1000);
    start.setMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 45 * 60 * 1000);
    setStartsAt(toLocalInputValue(start));
    setEndsAt(toLocalInputValue(end));
  }, []);

  const submit = async () => {
    if (!startsAt || !endsAt) return;
    setSaving(true);
    try {
      await api.post('/appointments/slots', {
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        location,
        notes,
      });
      setFormOpen(false);
      setLocation('');
      setNotes('');
      load();
    } catch (err: any) {
      Alert.alert('Слоты приема', err?.response?.data?.message || 'Не удалось создать слот');
    } finally {
      setSaving(false);
    }
  };

  const remove = (slot: Slot) => {
    const booking = (slot.bookings || []).find(item => item.status === 'confirmed');
    Alert.alert(booking ? 'Отменить запись и удалить слот?' : 'Удалить слот?', '', [
      { text: 'Нет', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          if (booking) await api.post(`/appointments/bookings/${booking.id}/cancel`);
          await api.delete(`/appointments/slots/${slot.id}`);
          load();
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Слоты', headerTintColor: colors.brand }} />
      <MobileShell eyebrow="Запись на прием" title="Мои слоты">
        <Button onPress={() => setFormOpen(true)} style={styles.createButton}>Новый слот</Button>
        {slots.length === 0 ? (
          <Card><Text style={styles.empty}>Откройте время, чтобы родители могли записаться</Text></Card>
        ) : (
          <View style={styles.stack}>
            {slots.map(slot => {
              const booking = (slot.bookings || []).find(item => item.status === 'confirmed');
              const past = new Date(slot.startsAt) < new Date();
              return (
                <Card key={slot.id} padding="md" style={past && styles.past}>
                  <View style={styles.cardHead}>
                    <View style={styles.iconBox}>
                      <Ionicons name="calendar-outline" size={18} color={colors.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.title}>
                        {new Date(slot.startsAt).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                        {' - '}
                        {new Date(slot.endsAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {slot.location ? <Text style={styles.meta}>{slot.location}</Text> : null}
                      {slot.notes ? <Text style={styles.body}>{slot.notes}</Text> : null}
                    </View>
                    <Pressable onPress={() => remove(slot)} style={styles.deleteButton}>
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </Pressable>
                  </View>
                  <View style={styles.badges}>
                    {booking ? <Badge tone="success" dot>есть запись{booking.topic ? ` · ${booking.topic}` : ''}</Badge> : <Badge tone={past ? 'neutral' : 'warn'}>{past ? 'прошел' : 'свободно'}</Badge>}
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </MobileShell>

      <Modal visible={formOpen} transparent animationType="fade" onRequestClose={() => setFormOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Новый слот</Text>
            <Text style={styles.label}>Начало</Text>
            <TextInput value={startsAt} onChangeText={setStartsAt} placeholder="2026-05-18T14:00" placeholderTextColor={colors.textMuted} style={styles.input} />
            <Text style={styles.label}>Конец</Text>
            <TextInput value={endsAt} onChangeText={setEndsAt} placeholder="2026-05-18T14:45" placeholderTextColor={colors.textMuted} style={styles.input} />
            <TextInput value={location} onChangeText={setLocation} placeholder="Кабинет или онлайн" placeholderTextColor={colors.textMuted} style={styles.input} />
            <TextInput value={notes} onChangeText={setNotes} placeholder="Комментарий" placeholderTextColor={colors.textMuted} style={[styles.input, styles.textarea]} multiline />
            <View style={styles.actions}>
              <Button onPress={submit} loading={saving}>Открыть слот</Button>
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
  past: { opacity: 0.7 },
  cardHead: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  iconBox: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.brandPale, alignItems: 'center', justifyContent: 'center' },
  deleteButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  meta: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  body: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
  empty: { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xxxl },
  overlay: { flex: 1, backgroundColor: 'rgba(27,31,42,0.45)', justifyContent: 'center', padding: spacing.lg },
  modal: { backgroundColor: colors.background, borderRadius: radius.xxl, padding: spacing.xl, gap: spacing.sm },
  modalTitle: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginBottom: spacing.xs },
  label: { color: colors.textMuted, fontSize: fontSize.xs, textTransform: 'uppercase', fontWeight: fontWeight.medium },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, color: colors.textPrimary, backgroundColor: colors.surface },
  textarea: { minHeight: 76, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
