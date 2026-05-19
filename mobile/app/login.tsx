import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Image,
  Platform, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import { useScreenLayout } from '../lib/layout';
import api, { API_URL, getPublicMediaUrl } from '../lib/api';
import { Button } from '../components/ui';

interface LoginBranding {
  title: string;
  titleSize: number;
  subtitle: string;
  subtitleSize: number;
  hasLogo: boolean;
  logoSize: number;
}

const DEFAULT_BRANDING: LoginBranding = {
  title: 'ГлобоАтлас',
  titleSize: 44,
  subtitle: 'Среда, в которой ребенок ведет сам.',
  subtitleSize: 14,
  hasLogo: false,
  logoSize: 86,
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<LoginBranding>(DEFAULT_BRANDING);
  const { login } = useAuth();
  const router = useRouter();
  const screen = useScreenLayout();

  useEffect(() => {
    api.get('/site-content/login')
      .then(r => {
        const data = r.data || {};
        setBranding({
          title: typeof data.title === 'string' ? data.title : DEFAULT_BRANDING.title,
          titleSize: Math.min(Number(data.titleSize) || DEFAULT_BRANDING.titleSize, 48),
          subtitle: typeof data.subtitle === 'string' ? data.subtitle : DEFAULT_BRANDING.subtitle,
          subtitleSize: Number(data.subtitleSize) || DEFAULT_BRANDING.subtitleSize,
          hasLogo: Boolean(data.logoUrl),
          logoSize: Math.min(Number(data.logoSize) || DEFAULT_BRANDING.logoSize, 110),
        });
      })
      .catch(() => {});
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Ошибка', 'Введите email и пароль');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/home');
    } catch (err: any) {
      const msg = err?.response?.data?.message ||
        (err?.code === 'ECONNABORTED' || !err?.response
          ? 'Не удалось подключиться к серверу. Проверьте сеть и адрес API.'
          : 'Неверный email или пароль');
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
      <ScrollView
        contentContainerStyle={[
          styles.inner,
          {
            paddingHorizontal: screen.isNarrow ? spacing.lg : spacing.xxl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandBlock}>
          {branding.hasLogo ? (
            <Image
              source={{ uri: getPublicMediaUrl('/api/site-content/public/logo') }}
              style={[styles.logo, { width: branding.logoSize, height: branding.logoSize }]}
              resizeMode="contain"
            />
          ) : null}
          {branding.title ? (
            <Text style={[styles.title, { fontSize: branding.titleSize }]} numberOfLines={2}>
              {branding.title}
            </Text>
          ) : null}
          {branding.subtitle ? (
            <Text style={[styles.subtitle, { fontSize: branding.subtitleSize }]}>{branding.subtitle}</Text>
          ) : null}
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
          <Text style={styles.forgot}>Забыли пароль?</Text>
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
    minHeight: '100%',
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logo: {
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    lineHeight: 52,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    marginTop: spacing.lg,
    paddingBottom: spacing.md,
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
  forgot: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
