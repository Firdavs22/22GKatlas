import { Text, StyleSheet, TextStyle } from 'react-native';
import { ReactNode } from 'react';
import { colors, fontWeight } from '@/lib/theme';

export default function SectionLabel({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
});
