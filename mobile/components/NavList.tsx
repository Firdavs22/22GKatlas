import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, radius, shadows, spacing } from '../lib/theme';
import { MobileNavItem, toneColors } from '../lib/navigation';

export default function NavList({ items }: { items: MobileNavItem[] }) {
  return (
    <View style={styles.list}>
      {items.map((item) => {
        const tone = toneColors(item.tone);
        const disabled = !item.href;
        return (
          <TouchableOpacity
            key={item.label}
            style={[styles.item, disabled && styles.disabled]}
            activeOpacity={disabled ? 1 : 0.72}
            onPress={() => item.href && router.push(item.href as any)}
          >
            <View style={[styles.icon, { backgroundColor: tone.bg }]}>
              <Ionicons name={item.icon} size={20} color={tone.fg} />
            </View>
            <View style={styles.body}>
              <View style={styles.titleRow}>
                <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
                {!item.implemented && <Text style={styles.webOnly}>web</Text>}
              </View>
              <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
            </View>
            <Ionicons
              name={disabled ? 'lock-closed-outline' : 'chevron-forward'}
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  disabled: { opacity: 0.68 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  description: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  webOnly: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: colors.textMuted,
    backgroundColor: colors.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
});
