import { useEffect, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import MobileShell from '../../components/MobileShell';
import { Button, Card } from '../../components/ui';
import api from '../../lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '../../lib/theme';

interface Broadcast {
  id: string;
  title: string;
  message: string;
  sentAt: string;
  targetGroups: string[];
}

export default function AdminBroadcastsScreen() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const load = () => api.get('/activities/broadcasts').then(r => setBroadcasts(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post('/activities/broadcasts', {
        title: title.trim(),
        message: message.trim(),
        targetGroups: ['all'],
      });
      Alert.alert('Рассылка', `Отправлено: ${data.recipientsCount || 0}`);
      setTitle('');
      setMessage('');
      setFormOpen(false);
      load();
    } catch (err: any) {
      Alert.alert('Рассылка', err?.response?.data?.message || 'Не удалось отправить');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Рассылки', headerTintColor: colors.brand }} />
      <MobileShell eyebrow={`${broadcasts.length} отправлено`} title="Рассылки">
        <Button onPress={() => setFormOpen(true)} style={styles.createButton}>Новая рассылка</Button>
        {broadcasts.length === 0 ? (
          <Card><Text style={styles.empty}>История рассылок пуста</Text></Card>
        ) : (
          <View style={styles.stack}>
            {broadcasts.map(item => (
              <Card key={item.id} padding="md">
                <Text style={styles.meta}>{new Date(item.sentAt).toLocaleString('ru-RU')}</Text>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.message}</Text>
              </Card>
            ))}
          </View>
        )}
      </MobileShell>

      <Modal visible={formOpen} transparent animationType="fade" onRequestClose={() => setFormOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Новая рассылка</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="Заголовок" placeholderTextColor={colors.textMuted} style={styles.input} />
            <TextInput value={message} onChangeText={setMessage} placeholder="Сообщение" placeholderTextColor={colors.textMuted} style={[styles.input, styles.textarea]} multiline />
            <View style={styles.actions}>
              <Button onPress={submit} loading={sending}>Отправить всем</Button>
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
  title: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginTop: spacing.xs },
  meta: { color: colors.textMuted, fontSize: fontSize.xs },
  body: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.sm },
  empty: { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xxxl },
  overlay: { flex: 1, backgroundColor: 'rgba(27,31,42,0.45)', justifyContent: 'center', padding: spacing.lg },
  modal: { backgroundColor: colors.background, borderRadius: radius.xxl, padding: spacing.xl, gap: spacing.md },
  modalTitle: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, color: colors.textPrimary, backgroundColor: colors.surface },
  textarea: { minHeight: 120, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
