import { css, type Theme } from '@emotion/react';

/** How dark the glass is: `raised` sits on the page panel, `deep` sits on the black canvas. */
export type GlassTone = keyof Theme['glass']['tint'];

/**
 * The frosted glass recipe: a translucent tint, a blur, a light top edge, a faint bottom edge, and a
 * gloss on the top half. The element must be positioned, because the gloss is an absolute `::before`.
 */
export function glassSurface(theme: Theme, tone: GlassTone) {
  return css`
    background: ${theme.glass.fill}, ${theme.glass.tint[tone]};
    backdrop-filter: ${theme.glass.blur};
    -webkit-backdrop-filter: ${theme.glass.blur};
    box-shadow:
      inset 0 1px 0 ${theme.glass.highlight},
      inset 0 -1px 0 ${theme.glass.edge},
      inset 0 0 0 1px ${theme.glass.edge},
      ${theme.glass.shadow};
    &::before {
      content: '';
      position: absolute;
      inset: 0 0 auto;
      height: 50%;
      border-radius: inherit;
      background: ${theme.glass.sheen};
      pointer-events: none;
    }
  `;
}
