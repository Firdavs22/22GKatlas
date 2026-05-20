import { Stack } from 'expo-router';
import { colors } from '../../lib/theme';

export default function PediatricianStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        headerBackTitle: '',
        headerTintColor: colors.brand,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.foreground },
      }}
    />
  );
}
