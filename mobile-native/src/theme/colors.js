export const palette = {
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  green: '#22C55E',
  greenLight: '#DCFCE7',
  red: '#EF4444',
  redLight: '#FEE2E2',
  orange: '#F97316',
  orangeLight: '#FFEDD5',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  white: '#FFFFFF'
}

export const lightTheme = {
  mode: 'light',
  background: palette.gray50,
  card: palette.white,
  border: palette.gray200,
  text: palette.gray900,
  muted: palette.gray500,
  primary: palette.blue,
  success: palette.green,
  danger: palette.red,
  warning: palette.orange
}

export const darkTheme = {
  mode: 'dark',
  background: palette.gray900,
  card: palette.gray800,
  border: palette.gray700,
  text: palette.white,
  muted: palette.gray400,
  primary: '#60A5FA',
  success: '#4ADE80',
  danger: '#F87171',
  warning: '#FB923C'
}
