import { Pressable, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { ReactNode } from 'react';
import { colors, radius, spacing, fontWeight } from '@/lib/theme';

type Variant = 'primary' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  onPress: () => void;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export default function Button({
  onPress,
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  fullWidth = false,
}: ButtonProps) {
  const heights = { sm: 36, md: 44, lg: 52 };
  const fontSizes = { sm: 13, md: 15, lg: 16 };
  const paddings = { sm: spacing.md, md: spacing.lg, lg: spacing.xl };

  const variantStyle = (() => {
    if (variant === 'primary') return { bg: colors.brand, fg: colors.textInverse, border: colors.brand };
    if (variant === 'outline')
      return { bg: 'transparent', fg: colors.textPrimary, border: colors.border };
    return { bg: 'transparent', fg: colors.brand, border: 'transparent' };
  })();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          height: heights[size],
          paddingHorizontal: paddings[size],
          backgroundColor: variantStyle.bg,
          borderColor: variantStyle.border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.fg} size="small" />
      ) : typeof children === 'string' ? (
        <Text style={{ color: variantStyle.fg, fontSize: fontSizes[size], fontWeight: fontWeight.medium }}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
});
