import { View, ViewProps, StyleSheet } from 'react-native';
import { colors, radius, spacing, shadows } from '@/lib/theme';

interface CardProps extends ViewProps {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'plain' | 'pale';
}

export default function Card({ children, padding = 'md', variant = 'plain', style, ...rest }: CardProps) {
  const padStyle = {
    none: { padding: 0 },
    sm: { padding: spacing.md },
    md: { padding: spacing.lg },
    lg: { padding: spacing.xl },
  }[padding];

  return (
    <View
      {...rest}
      style={[
        styles.base,
        variant === 'pale' && styles.pale,
        padStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  pale: {
    backgroundColor: colors.brandPale,
  },
});
