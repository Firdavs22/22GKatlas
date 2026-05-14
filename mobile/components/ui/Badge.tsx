import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { ReactNode } from 'react';
import { colors, radius, spacing, fontWeight } from '@/lib/theme';

type Tone = 'brand' | 'success' | 'warn' | 'danger' | 'neutral';

const TONE_MAP: Record<Tone, { bg: string; fg: string }> = {
  brand: { bg: colors.brandPale, fg: colors.brand },
  success: { bg: colors.successBg, fg: '#1E5731' },
  warn: { bg: colors.warnBg, fg: '#7A4A1F' },
  danger: { bg: colors.dangerBg, fg: '#7C2424' },
  neutral: { bg: '#F1F5F9', fg: colors.textSecondary },
};

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  style?: ViewStyle;
}

export default function Badge({ children, tone = 'neutral', dot = false, style }: BadgeProps) {
  const t = TONE_MAP[tone];
  return (
    <View style={[styles.base, { backgroundColor: t.bg }, style]}>
      {dot && <View style={[styles.dot, { backgroundColor: t.fg }]} />}
      <Text style={{ color: t.fg, fontSize: 11, fontWeight: fontWeight.medium }}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
