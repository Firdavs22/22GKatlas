import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MobileShell from '../../components/MobileShell';
import { Badge, Button, Card, SectionLabel } from '../../components/ui';
import api from '../../lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '../../lib/theme';

interface Slot {
  id: string;
  startsAt: string;
  endsAt: string;
  location?: string | null;
  notes?: string | null;
  staff?: { id: string; name: string; role: string } | null;
}

interface Booking {
  id: string;
  slotId: string;
  childId?: string | null;
  topic?: string | null;
  slot: Slot & { staffId: string };
}

interface ChildLite {
  id: string;
  name: string;
}

const ROLE_LABEL: Record<string, string> = {
  psychologist: 'Психолог',
  pediatrician: 'Педиатр',
  teacher: 'Педагог',
};

function dateLabel(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ParentAppointmentsScreen() {
  const [available, setAvailable] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [children, setChildren] = useState<ChildLite[]>([]);
  const [booking, setBooking] = useState<{ slot: Slot; childId: string; topic: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    api.get('/appointments/available').then(r => setAvailable(r.data));
    api.get('/appointments/bookings/mine').then(r => setBookings(r.data));
  };

  useEffect(() => {
    load();
    api.get('/children').then(r => setChildren(r.data));
  }, []);

  const byStaff = useMemo(() => {
    const map = new Map<string, { staff: Slot['staff']; slots: Slot[] }>();
    for (const slot of available) {
      if (!slot.staff) continue;
      if (!map.has(slot.staff.id)) map.set(slot.staff.id, { staff: slot.staff, slots: [] });
      map.get(slot.staff.id)!.slots.push(slot);
    }
    return Array.from(map.values());
  }, [available]);

  const confirmBooking = async () => {
    if (!booking) return;
    setSubmitting(true);
    try {
      await api.post(`/appointments/slots/${booking.slot.id}/book`, {
        childId: booking.childId || undefined,
        topic: booking.topic || undefined,
      });
      setBooking(null);
      load();
    } catch (err: any) {
      Alert.alert('Запись на прием', err?.response?.data?.message || 'Не удалось записаться');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelBooking = (id: string) => {
    Alert.alert('Отменить запись?', '', [
      { text: 'Нет', style: 'cancel' },
      {
        text: 'Отменить',
        style: 'destructive',
        onPress: async () => {
          await api.post(`/appointments/bookings/${id}/cancel`);
          load();
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Запись', headerTintColor: colors.brand }} />
      <MobileShell eyebrow="К психологу, педиатру, педагогу" title="Запись на прием">
        {bookings.length > 0 ? (
          <View style={styles.section}>
            <SectionLabel>Мои записи</SectionLabel>
            {bookings.map(item => (
              <Card key={item.id} padding="sm" style={styles.booking}>
                <View style={styles.rowTop}>
                  <View style={styles.iconBox}>
                    <Ionicons name="calendar-outline" size={18} color={colors.brand} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.title}>{dateLabel(item.slot.startsAt)}</Text>
                    <Text style={styles.meta}>
                      {item.slot.staff?.name || 'Специалист'} · {ROLE_LABEL[item.slot.staff?.role || ''] || item.slot.staff?.role || ''}
                    </Text>
                    {item.slot.location ? <Text style={styles.meta}>{item.slot.location}</Text> : null}
                    {item.topic ? <Text style={styles.body}>Тема: {item.topic}</Text> : null}
                  </View>
                  <Pressable onPress={() => cancelBooking(item.id)} style={styles.iconButton}>
                    <Ionicons name="close-outline" size={22} color={colors.danger} />
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>
        ) : null}

        <SectionLabel>Свободные слоты</SectionLabel>
        {byStaff.length === 0 ? (
          <Card style={styles.emptyCard}><Text style={styles.empty}>Сейчас нет свободных слотов</Text></Card>
        ) : (
          <View style={styles.staffStack}>
            {byStaff.map(({ staff, slots }) => (
              <View key={staff!.id} style={styles.staffBlock}>
                <Text style={styles.staffName}>{staff!.name}</Text>
                <Text style={styles.meta}>{ROLE_LABEL[staff!.role] || staff!.role}</Text>
                <View style={styles.slots}>
                  {slots.map(slot => (
                    <Pressable
                      key={slot.id}
                      onPress={() => setBooking({ slot, childId: children[0]?.id || '', topic: '' })}
                      style={styles.slot}
                    >
                      <Text style={styles.slotTime}>{dateLabel(slot.startsAt)}</Text>
                      <Text style={styles.meta}>
                        до {new Date(slot.endsAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        {slot.location ? ` · ${slot.location}` : ''}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </MobileShell>

      <Modal visible={Boolean(booking)} transparent animationType="fade" onRequestClose={() => setBooking(null)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {booking ? (
              <>
                <SectionLabel>Запись на прием</SectionLabel>
                <Text style={styles.modalTitle}>{dateLabel(booking.slot.startsAt)}</Text>
                <Text style={styles.meta}>
                  {booking.slot.staff?.name} · {ROLE_LABEL[booking.slot.staff?.role || ''] || ''}
                  {booking.slot.location ? ` · ${booking.slot.location}` : ''}
                </Text>
                {children.length > 1 ? (
                  <View style={styles.childTabs}>
                    {children.map(child => (
                      <Pressable key={child.id} onPress={() => setBooking(prev => prev ? { ...prev, childId: child.id } : prev)} style={[styles.childTab, booking.childId === child.id && styles.childTabActive]}>
                        <Text style={[styles.childText, booking.childId === child.id && styles.childTextActive]}>{child.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <TextInput
                  value={booking.topic}
                  onChangeText={topic => setBooking(prev => prev ? { ...prev, topic } : prev)}
                  placeholder="Тема обращения"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  multiline
                />
                <Badge tone="success" dot>Время будет занято только для вас</Badge>
                <View style={styles.actions}>
                  <Button onPress={confirmBooking} loading={submitting}>Подтвердить</Button>
                  <Button onPress={() => setBooking(null)} variant="outline">Отмена</Button>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.xl, gap: spacing.sm },
  booking: { marginTop: spacing.sm },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  iconBox: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.brandPale, alignItems: 'center', justifyContent: 'center' },
  iconButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  title: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  meta: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  body: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.sm },
  emptyCard: { marginTop: spacing.sm },
  empty: { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xxxl },
  staffStack: { marginTop: spacing.md, gap: spacing.xl },
  staffBlock: { gap: spacing.xs },
  staffName: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  slots: { gap: spacing.sm, marginTop: spacing.sm },
  slot: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, backgroundColor: colors.surface },
  slotTime: { color: colors.brand, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  overlay: { flex: 1, backgroundColor: 'rgba(27,31,42,0.45)', justifyContent: 'center', padding: spacing.lg },
  modal: { backgroundColor: colors.background, borderRadius: radius.xxl, padding: spacing.xl, gap: spacing.md },
  modalTitle: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  input: { minHeight: 92, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, color: colors.textPrimary, backgroundColor: colors.surface, textAlignVertical: 'top' },
  childTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  childTab: { height: 34, paddingHorizontal: spacing.md, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  childTabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  childText: { color: colors.textSecondary, fontSize: fontSize.sm },
  childTextActive: { color: colors.textInverse },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
