import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { colors, fontSize } from '../../lib/theme';
import type { Role } from '../../lib/types';

// Define which tabs each role can see
const ROLE_TABS: Record<Role, string[]> = {
  admin:        ['home', 'feed', 'chats', 'profile'],
  teacher:      ['home', 'feed', 'chats', 'profile'],
  parent:       ['home', 'feed', 'chats', 'profile'],
  psychologist: ['home', 'chats', 'profile'],
  pediatrician: ['home', 'chats', 'profile'],
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<string, { title: string; icon: IconName; iconFocused: IconName }> = {
  home:    { title: 'Главная',  icon: 'home-outline',         iconFocused: 'home' },
  feed:    { title: 'Лента',    icon: 'newspaper-outline',    iconFocused: 'newspaper' },
  chats:   { title: 'Чаты',     icon: 'chatbubbles-outline',  iconFocused: 'chatbubbles' },
  profile: { title: 'Профиль',  icon: 'person-outline',       iconFocused: 'person' },
};

export default function TabLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;

  const visibleTabs = ROLE_TABS[user.role] || ['home', 'profile'];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
          paddingBottom: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: '500',
        },
      }}
    >
      {Object.entries(TAB_CONFIG).map(([key, config]) => (
        <Tabs.Screen
          key={key}
          name={key}
          options={{
            title: config.title,
            href: visibleTabs.includes(key) ? undefined : null, // null = hide tab
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? config.iconFocused : config.icon} size={22} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
