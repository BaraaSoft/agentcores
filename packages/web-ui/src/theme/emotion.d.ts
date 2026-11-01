import '@emotion/react';
import type { theme } from './theme';

type AppTheme = typeof theme;

declare module '@emotion/react' {
  /** The dashboard theme, so `props.theme` in styled components is fully typed. */
  export interface Theme extends AppTheme {}
}
