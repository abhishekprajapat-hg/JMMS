import { Platform } from 'react-native'

const lightColors = {
  background: '#fff7ed',
  backgroundMuted: '#ffedd5',
  backgroundAlt: '#f8fafc',
  card: 'rgba(255,255,255,0.9)',
  cardStrong: '#ffffff',
  border: 'rgba(234, 88, 12, 0.16)',
  borderStrong: 'rgba(194, 65, 12, 0.24)',
  text: '#1f2937',
  textMuted: '#6b7280',
  textSoft: '#9ca3af',
  accent: '#c2410c',
  accentStrong: '#9a3412',
  accentSoft: '#f59e0b',
  accentSurface: '#fff1df',
  success: '#166534',
  danger: '#b91c1c',
  overlay: 'rgba(17, 24, 39, 0.48)',
  shadow: '#7c2d12',
}

const darkColors = {
  background: '#120f0d',
  backgroundMuted: '#1c1917',
  backgroundAlt: '#18181b',
  card: 'rgba(32, 24, 20, 0.92)',
  cardStrong: '#201813',
  border: 'rgba(251, 146, 60, 0.18)',
  borderStrong: 'rgba(251, 146, 60, 0.3)',
  text: '#f8fafc',
  textMuted: '#d6d3d1',
  textSoft: '#a8a29e',
  accent: '#fb923c',
  accentStrong: '#fdba74',
  accentSoft: '#fbbf24',
  accentSurface: '#2c1d14',
  success: '#4ade80',
  danger: '#fca5a5',
  overlay: 'rgba(0, 0, 0, 0.62)',
  shadow: '#000000',
}

export function getTheme(darkMode = false) {
  const colors = darkMode ? darkColors : lightColors

  return {
    darkMode,
    colors,
    gradients: {
      page: darkMode
        ? ['#1c1917', '#111827', '#09090b']
        : ['#fff7ed', '#ffedd5', '#f8fafc'],
      hero: darkMode
        ? ['#7c2d12', '#c2410c', '#fb923c']
        : ['#7c2d12', '#c2410c', '#f59e0b'],
      warmCard: darkMode
        ? ['rgba(124,45,18,0.95)', 'rgba(194,65,12,0.88)', 'rgba(251,146,60,0.82)']
        : ['#7c2d12', '#c2410c', '#f59e0b'],
    },
    radius: {
      sm: 14,
      md: 20,
      lg: 28,
      xl: 36,
    },
    cardShadow: Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOpacity: darkMode ? 0.22 : 0.12,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 12 },
      },
      android: {
        elevation: darkMode ? 2 : 5,
      },
      default: {},
    }),
  }
}
