// Design tokens for GloboAtlas mobile app
// Matches web app color scheme for consistency

export const colors = {
  // Primary brand
  primary: '#4F46E5',       // indigo-600
  primaryDark: '#4338CA',   // indigo-700
  primaryLight: '#818CF8',  // indigo-400
  primaryBg: '#EEF2FF',     // indigo-50

  // Secondary
  secondary: '#7C3AED',     // violet-600
  secondaryLight: '#A78BFA', // violet-400

  // Status
  success: '#10B981',       // emerald-500
  successBg: '#ECFDF5',
  warning: '#F59E0B',       // amber-500
  warningBg: '#FFFBEB',
  danger: '#EF4444',        // red-500
  dangerBg: '#FEF2F2',
  info: '#3B82F6',          // blue-500
  infoBg: '#EFF6FF',

  // Neutrals
  background: '#F9FAFB',    // gray-50
  surface: '#FFFFFF',
  border: '#E5E7EB',        // gray-200
  borderLight: '#F3F4F6',   // gray-100

  // Text
  textPrimary: '#111827',   // gray-900
  textSecondary: '#6B7280', // gray-500
  textMuted: '#9CA3AF',     // gray-400
  textInverse: '#FFFFFF',

  // Stage colors (progress matrix)
  stageNone: '#F3F4F6',
  stageNoneText: '#9CA3AF',
  stagePresented: '#FEF3C7',
  stagePresentedText: '#B45309',
  stagePracticing: '#DBEAFE',
  stagePracticingText: '#1D4ED8',
  stageMastered: '#D1FAE5',
  stageMasteredText: '#047857',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

// Stage labels and colors
export const STAGE_CONFIG = {
  none: { label: '—', bg: colors.stageNone, text: colors.stageNoneText },
  presented: { label: 'ЗН', bg: colors.stagePresented, text: colors.stagePresentedText },
  practicing: { label: 'ПВ', bg: colors.stagePracticing, text: colors.stagePracticingText },
  mastered: { label: 'УС', bg: colors.stageMastered, text: colors.stageMasteredText },
} as const;

export const DAY_NAMES = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт'];
