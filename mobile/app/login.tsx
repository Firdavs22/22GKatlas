import { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView,
  Platform, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import { API_URL } from '../lib/api';
import { Button, SectionLabel } from '../components/ui';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Ошибка', 'Введите email и пароль');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)/home');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Неверный email или пароль';
      Alert.alert('Ошибка входа', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.brandBlock}>
          <SectionLabel style={{ textAlign: 'center', marginBottom: 8 }}>
            Метод Марии Монтессори
          </SectionLabel>
          <Text style={styles.title}>
            Глобо<Text style={{ fontStyle: 'italic' }}>Атлас</Text>
          </Text>
          <Text style={styles.subtitle}>Среда, в которой ребёнок ведёт сам.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="вы@почта.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />

          <Text style={[styles.label, { marginTop: spacing.lg }]}>Пароль</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
          />

          <Button
            variant="primary"
            onPress={handleLogin}
            loading={loading}
            fullWidth
            style={{ marginTop: spacing.xl }}
            size="lg"
          >
            Войти
          </Button>
        </View>

        {__DEV__ && (
          <View style={styles.hint}>
            <Text style={styles.apiHint}>API: {API_URL}/api</Text>
            <Text style={styles.hintTitle}>Тестовые аккаунты</Text>
            <Text style={styles.hintText}>admin@test.com · admin123</Text>
            <Text style={styles.hintText}>teacher@test.com · teacher123</Text>
            <Text style={styles.hintText}>parent@test.com · parent123</Text>
            <Text style={styles.hintText}>psychologist@test.com · psych123</Text>
            <Text style={styles.hintText}>pediatrician@test.com · peds123</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  title: {
    fontFamily: 'serif',
    fontSize: 44,
    color: colors.textPrimary,
    lineHeight: 50,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xxl,
  },
  label: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    height: 46,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  hint: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  apiHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  hintTitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  hintText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
