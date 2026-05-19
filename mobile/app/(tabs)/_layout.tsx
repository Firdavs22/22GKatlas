import { Tabs, Redirect, router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View, Pressable, StyleSheet } from 'react-native';
import OnboardingModal from '../../components/OnboardingModal';
import { colors, fontSize, radius, shadows, spacing } from '../../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Role } from '../../lib/types';

// Define which tabs each role can see
const ROLE_TABS: Record<Role, string[]> = {
  admin:        ['home', 'profile'],
  superadmin:   ['home', 'profile'],
  teacher:      ['home', 'feed', 'post', 'chats', 'profile'],
  parent:       ['home', 'progress', 'feed', 'chats', 'profile'],
  psychologist: ['home', 'chats', 'profile'],
  pediatrician: ['home', 'chats', 'profile'],
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<string, { title: string; icon: IconName; iconFocused: IconName }> = {
  home:    { title: 'Главная',  icon: 'home-outline',         iconFocused: 'home' },
  progress:{ title: 'Карта',    icon: 'map-outline',          iconFocused: 'map' },
  feed:    { title: 'Лента',    icon: 'newspaper-outline',    iconFocused: 'newspaper' },
  post:    { title: '',         icon: 'add',                  iconFocused: 'add' },
  chats:   { title: 'Чаты',     icon: 'chatbubbles-outline',  iconFocused: 'chatbubbles' },
  profile: { title: 'Еще',      icon: 'menu-outline',         iconFocused: 'menu' },
};

/** Большая центральная FAB-кнопка «+» в стиле Instagram. */
function CreatePostButton() {
  return (
    <View style={styles.fabSlot}>
      <Pressable
        onPress={() => router.push('/new-post')}
        style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.85 : 1 }]}
        accessibilityLabel="Создать пост"
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </Pressable>
    </View>
  );
}

export default function TabLayout() {
  const { user, loading } = useAuth();
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;

  const visibleTabs = ROLE_TABS[user.role] || ['home', 'profile'];

  return (
    <>
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 6,
          height: 64 + Math.max(insets.bottom, 6),
        },
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: '500',
        },
      }}
    >
      {Object.entries(TAB_CONFIG).map(([key, config]) => {
        if (key === 'post') {
          const visible = visibleTabs.includes(key);
          // Для учителя — большая «+» FAB; для остальных таб скрыт через href:null
          return (
            <Tabs.Screen
              key={key}
              name={key}
              options={{
                title: '',
                href: visible ? undefined : null,
                tabBarButton: visible ? (props) => <CreatePostButton {...props} /> : undefined,
              }}
            />
          );
        }
        return (
          <Tabs.Screen
            key={key}
            name={key}
            options={{
              title: config.title,
              href: visibleTabs.includes(key) ? undefined : null,
              tabBarIcon: ({ focused, color }) => (
                <Ionicons name={focused ? config.iconFocused : config.icon} size={22} color={color} />
              ),
            }}
          />
        );
      })}
      </Tabs>
      <OnboardingModal />
    </>
  );
}

const styles = StyleSheet.create({
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
