// GloboAtlas mobile — палитра из прототипа (web).
// Никакого indigo/purple — только brand/brand-pale/success/warn/danger.

export const colors = {
  // Brand (тёмно-синий из прототипа)
  brand: '#0F5192',
  brandSoft: '#1B6BB8',
  brandPale: '#E8EEF5',
  brandPaleSoft: '#F4F8FB',

  // Status
  success: '#83C696',
  successBg: '#EAF5EE',
  warn: '#F1C49E',
  warnBg: '#FBEFE3',
  danger: '#E58E8E',
  dangerBg: '#FBE9E9',

  // Surface / neutrals
  background: '#F8F4ED',  // тёплый бежевый бэкграунд прототипа
  surface: '#FFFFFF',
  surfaceAlt: '#F3EEE6',
  border: '#E5E1D8',
  borderLight: '#EFECE5',

  // Text
  foreground: '#1B1F2A',
  textPrimary: '#1B1F2A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // Stage colors (matrix dots)
  stageNone: '#FFFFFF',
  stageNoneBorder: '#CBD5E1',
  stagePresented: '#F1C49E',
  stagePracticing: '#7EB3E4',
  stageMastered: '#83C696',

  // ── Aliases для старого кода (миграционный слой) ──
  primary: '#0F5192',
  primaryDark: '#0A3C6B',
  primaryLight: '#7EB3E4',
  primaryBg: '#E8EEF5',
  secondary: '#1B6BB8',
  secondaryLight: '#7EB3E4',
  warning: '#F1C49E',
  info: '#7EB3E4',
  infoBg: '#E8EEF5',

  // legacy stage palette (текстовые цвета для STAGE_CONFIG.* в старом коде)
  stageNoneText: '#94A3B8',
  stagePresentedText: '#7A4A1F',
  stagePracticingText: '#0F3D6B',
  stageMasteredText: '#1E5731',
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
  xxl: 28,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  xxxl: 34,
} as const;

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

/** Serif шрифт — используем системный по платформам.
 *  В web версии Lora через Google Fonts; для нативки достаточно платформенного serif. */
export const fontFamily = {
  serif: 'serif',
  sans: undefined as string | undefined, // системный
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
};

// Подписи стадий + цвета — для матрицы и значков
export const STAGE_CONFIG = {
  none: { label: '—', bg: colors.stageNone, text: colors.textMuted },
  presented: { label: 'ЗН', bg: colors.stagePresented, text: '#7A4A1F' },
  practicing: { label: 'ПВ', bg: colors.stagePracticing, text: '#0F3D6B' },
  mastered: { label: 'УС', bg: colors.stageMastered, text: '#1E5731' },
} as const;

export const DAY_NAMES = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт'];
