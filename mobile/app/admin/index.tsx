import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, Stack } from 'expo-router';
import { colors } from '../../lib/theme';
import { useAuth } from '../../context/AuthContext';
import MobileShell from '../../components/MobileShell';
import NavList from '../../components/NavList';
import { ROLE_NAV } from '../../lib/navigation';

export default function AdminScreen() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) return <Redirect href="/login" />;
  if (user.role !== 'admin') return <Redirect href="/(tabs)/home" />;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Админка', headerTintColor: colors.primary }} />
      <MobileShell eyebrow="Администратор" title="Быстрый доступ">
        <NavList items={ROLE_NAV.admin} />
      </MobileShell>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
