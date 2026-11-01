import { css, Global, useTheme } from '@emotion/react';

/** The page-wide reset: a full-height black canvas, Inter, and quiet focus and selection colours. */
export function GlobalStyles() {
  const theme = useTheme();
  return (
    <Global
      styles={css`
        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }
        html {
          color-scheme: dark;
        }
        html,
        body,
        #root {
          height: 100%;
          margin: 0;
        }
        body {
          background: ${theme.color.canvas};
          color: ${theme.color.text};
          font-family: ${theme.font.family};
          font-size: ${theme.font.size.md};
          font-weight: ${theme.font.weight.regular};
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-feature-settings: 'cv11', 'ss01';
        }
        ::selection {
          background: ${theme.color.accentSoft};
        }
        button {
          font: inherit;
          color: inherit;
        }
        :focus-visible {
          outline: 1px solid ${theme.color.accent};
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}
    />
  );
}
