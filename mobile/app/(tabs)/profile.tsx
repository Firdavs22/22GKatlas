import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import MobileShell from '../../components/MobileShell';
import NavList from '../../components/NavList';
import api from '../../lib/api';
import { ROLE_LABELS, ROLE_NAV } from '../../lib/navigation';
import { colors, fontSize, fontWeight, radius, spacing } from '../../lib/theme';

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Выход', 'Выйти из аккаунта?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  if (!user) return null;

  return (
    <MobileShell eyebrow={ROLE_LABELS[user.role]} title="Разделы">
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={22} color={colors.brand} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
          <Text style={styles.email} numberOfLines={1}>{user.email}</Text>
        </View>
      </View>

      <NavList items={ROLE_NAV[user.role]} userRole={user.role} />

      <TouchableOpacity
        style={styles.replayTour}
        activeOpacity={0.75}
        onPress={async () => {
          try {
            await api.post('/me/onboarding/reset');
            Alert.alert('Тур', 'При следующем входе вы увидите подсказки.');
          } catch {
            Alert.alert('Ошибка', 'Не удалось сбросить тур');
          }
        }}
      >
        <Ionicons name="book-outline" size={18} color={colors.brand} />
        <Text style={styles.replayText}>Посмотреть тур заново</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logout} onPress={handleLogout} activeOpacity={0.75}>
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={styles.logoutText}>Выйти из аккаунта</Text>
      </TouchableOpacity>

      <Text style={styles.version}>ГлобоАтлас v1.0.0</Text>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.brandPale,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  email: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  logout: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerBg,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  logoutText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.danger },
  replayTour: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.brandPale,
  },
  replayText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.brand },
  version: { textAlign: 'center', fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xl },
});
