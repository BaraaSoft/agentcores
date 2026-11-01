/**
 * The design tokens of the dashboard: a near-black, Linear-style surface with one Meta blue accent
 * and a green that only means "live work".
 */
export const theme = {
  color: {
    canvas: '#08090A',
    surface: '#0F1011',
    surfaceRaised: '#16171A',
    hover: 'rgba(255, 255, 255, 0.04)',
    selected: 'rgba(255, 255, 255, 0.07)',
    border: '#1C1D1F',
    borderStrong: '#26282C',
    text: '#F7F8F8',
    textMuted: '#8A8F98',
    textFaint: '#5B5F66',
    accent: '#0081FB',
    accentStrong: '#0064E0',
    accentSoft: 'rgba(0, 129, 251, 0.16)',
    live: '#4CB782',
    liveSoft: 'rgba(76, 183, 130, 0.14)',
    danger: '#EB5757',
    dangerSoft: 'rgba(235, 87, 87, 0.14)',
    warning: '#E9B44C',
    warningSoft: 'rgba(233, 180, 76, 0.14)',
    accentText: '#5AAEFF',
    grid: 'rgba(255, 255, 255, 0.05)',
  },
  font: {
    family: `'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
    mono: `'SF Mono', ui-monospace, 'JetBrains Mono', Menlo, monospace`,
    size: { xs: '12px', sm: '13px', md: '14px', lg: '17px', xl: '22px' },
    weight: { regular: 400, medium: 500, semibold: 600 },
  },
  glass: {
    fill: 'linear-gradient(180deg, rgba(255, 255, 255, 0.055) 0%, rgba(255, 255, 255, 0.018) 100%)',
    tint: { raised: 'rgba(15, 16, 17, 0.62)', deep: 'rgba(6, 7, 8, 0.58)' },
    blur: 'blur(24px) saturate(180%)',
    highlight: 'rgba(255, 255, 255, 0.09)',
    edge: 'rgba(255, 255, 255, 0.06)',
    sheen: 'linear-gradient(180deg, rgba(255, 255, 255, 0.035), transparent)',
    shadow: '0 8px 24px -12px rgba(0, 0, 0, 0.6)',
  },
  radius: { sm: '4px', md: '6px', lg: '10px' },
  space: (steps: number): string => `${steps * 4}px`,
  layout: { railWidth: '76px', headerHeight: '68px', pageInset: '8px' },
  motion: {
    spring: { type: 'spring', stiffness: 520, damping: 38, mass: 0.8 },
    fast: { duration: 0.14, ease: [0.25, 0.1, 0.25, 1] },
  },
} as const;
