import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { API_URL } from '../../lib/api';
import { getToken } from '../../lib/auth';
import { useAuth } from '../../context/AuthContext';
import { colors, fontSize, fontWeight, radius, shadows, spacing } from '../../lib/theme';

const inputCls = {
  height: 44,
  paddingHorizontal: spacing.md,
  fontSize: fontSize.md,
  color: colors.textPrimary,
  backgroundColor: colors.surface,
  borderRadius: radius.lg,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: colors.borderLight,
} as const;

const DELETE_WORD = 'УДАЛИТЬ';

export default function ParentSettingsScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const [deleteWord, setDeleteWord] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const changePassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Пароль', 'Минимум 8 символов');
      return;
    }
    setSavingPwd(true);
    try {
      await api.put('/me/password', { oldPassword, newPassword });
      Alert.alert('Готово', 'Пароль обновлён');
      setOldPassword(''); setNewPassword('');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('Ошибка', msg || 'Не удалось сменить пароль');
    } finally {
      setSavingPwd(false);
    }
  };

  const exportData = async () => {
    const token = await getToken();
    if (!token) return;
    const url = `${API_URL}/api/me/export?token=${encodeURIComponent(token)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Ошибка', 'Не удалось открыть ссылку');
    });
  };

  const deleteAccount = async () => {
    if (deleteWord !== DELETE_WORD) return;
    if (!deletePassword) {
      Alert.alert('Удаление', 'Введите ваш пароль');
      return;
    }
    setDeleting(true);
    try {
      await api.delete('/me', { data: { password: deletePassword, confirmation: DELETE_WORD } });
      await logout();
      router.replace('/login');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('Ошибка', msg || 'Не удалось удалить аккаунт');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: 'Настройки', headerTintColor: colors.brand }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Профиль */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Аккаунт</Text>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(user?.name || '?').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{user?.name}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* Смена пароля */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Смена пароля</Text>
          <TextInput
            value={oldPassword}
            onChangeText={setOldPassword}
            placeholder="Текущий пароль"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            style={[inputCls, { marginBottom: spacing.sm }]}
          />
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Новый пароль (мин. 8 символов)"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            style={[inputCls, { marginBottom: spacing.md }]}
          />
          <Pressable
            onPress={changePassword}
            disabled={savingPwd || !oldPassword || newPassword.length < 8}
            style={[styles.primaryBtn, (savingPwd || !oldPassword || newPassword.length < 8) && styles.primaryBtnDisabled]}
          >
            <Text style={styles.primaryBtnText}>{savingPwd ? 'Сохраняем…' : 'Сменить пароль'}</Text>
          </Pressable>
        </View>

        {/* Экспорт данных */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Ваши данные</Text>
          <Text style={styles.helpText}>
            Скачайте ZIP-архив со всеми данными, которые хранит о вас система: профиль, данные ребёнка,
            фото из ленты и портфолио, прогресс, наблюдения, посещаемость.
          </Text>
          <Pressable onPress={exportData} style={styles.outlineBtn}>
            <Ionicons name="download-outline" size={18} color={colors.brand} />
            <Text style={styles.outlineBtnText}>Скачать архив данных</Text>
          </Pressable>
        </View>

        {/* Удаление */}
        <View style={[styles.card, styles.dangerCard]}>
          <Text style={[styles.sectionLabel, { color: colors.danger }]}>Опасная зона</Text>
          <Text style={styles.helpText}>
            Удаление аккаунта необратимо. Личные данные (email, имя, телефон) будут анонимизированы.
            Введите ваш пароль и слово <Text style={{ fontWeight: fontWeight.bold }}>{DELETE_WORD}</Text> для подтверждения.
          </Text>
          <TextInput
            value={deletePassword}
            onChangeText={setDeletePassword}
            placeholder="Ваш пароль"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            style={[inputCls, { marginBottom: spacing.sm }]}
          />
          <TextInput
            value={deleteWord}
            onChangeText={setDeleteWord}
            placeholder={`Введите ${DELETE_WORD}`}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            style={[inputCls, { marginBottom: spacing.md }]}
          />
          <Pressable
            onPress={deleteAccount}
            disabled={deleteWord !== DELETE_WORD || !deletePassword || deleting}
            style={[styles.dangerBtn, (deleteWord !== DELETE_WORD || !deletePassword || deleting) && styles.primaryBtnDisabled]}
          >
            <Ionicons name="trash-outline" size={16} color={colors.textInverse} />
            <Text style={styles.dangerBtnText}>{deleting ? 'Удаляем…' : 'Удалить аккаунт'}</Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxxl },

  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, ...shadows.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderLight },
  dangerCard: { borderColor: '#FECACA' },

  sectionLabel: { fontSize: fontSize.xs, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: fontWeight.medium, marginBottom: spacing.md },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brandPale, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.brand, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  profileName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  profileEmail: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },

  helpText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.md },

  primaryBtn: { height: 44, borderRadius: 22, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { color: colors.textInverse, fontSize: fontSize.md, fontWeight: fontWeight.medium },

  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.brand, backgroundColor: colors.surface },
  outlineBtnText: { color: colors.brand, fontSize: fontSize.md, fontWeight: fontWeight.medium },

  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 22, backgroundColor: colors.danger },
  dangerBtnText: { color: colors.textInverse, fontSize: fontSize.md, fontWeight: fontWeight.medium },
});
