import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '../../lib/theme';
import { Ionicons } from '@expo/vector-icons';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  teacher: 'Педагог',
  parent: 'Родитель',
  psychologist: 'Психолог',
  pediatrician: 'Педиатр',
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти', style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll}>
        {/* Profile header */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={{ fontSize: 36 }}>
              {user.role === 'admin' ? '🔑' : user.role === 'teacher' ? '👩‍🏫' : user.role === 'parent' ? '👨‍👩‍👧' : '🧑‍⚕️'}
            </Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userRole}>{ROLE_LABELS[user.role] || user.role}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>

        {/* Settings */}
        <Text style={styles.sectionTitle}>Настройки</Text>

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={20} color={colors.primary} />
          <Text style={styles.menuLabel}>Уведомления</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <Ionicons name="phone-portrait-outline" size={20} color={colors.primary} />
          <Text style={styles.menuLabel}>Активные сессии</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
          <Text style={styles.menuLabel}>Безопасность</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.menuLabel}>О приложении</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Выйти из аккаунта</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>ГлобоАтлас v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1, paddingHorizontal: spacing.lg },

  profileCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.xxl, alignItems: 'center',
    marginTop: spacing.lg, ...shadows.md,
  },
  avatarLarge: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
  },
  userName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  userRole: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium, marginTop: spacing.xs },
  userEmail: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },

  sectionTitle: {
    fontSize: fontSize.lg, fontWeight: fontWeight.bold,
    color: colors.textPrimary, marginTop: spacing.xxl, marginBottom: spacing.md,
  },

  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.sm, gap: spacing.md,
    ...shadows.sm,
  },
  menuLabel: { flex: 1, fontSize: fontSize.md, color: colors.textPrimary },

  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.dangerBg, borderRadius: radius.lg,
    padding: spacing.lg, marginTop: spacing.xxl, gap: spacing.sm,
  },
  logoutText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.danger },

  version: { textAlign: 'center', fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xl, marginBottom: spacing.xxxl },
});
