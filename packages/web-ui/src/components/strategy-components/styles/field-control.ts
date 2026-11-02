import { css, type Theme } from '@emotion/react';

/** The look of every text control in the strategy form: a dark well that lights up in Meta blue on focus. */
export function fieldControl(theme: Theme, hasError: boolean) {
  return css`
    width: 100%;
    padding: ${theme.space(3)} ${theme.space(3.5)};
    border: 1px solid ${hasError ? theme.color.danger : theme.color.borderStrong};
    border-radius: ${theme.radius.md};
    outline: none;
    background: rgba(255, 255, 255, 0.025);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
    color: ${theme.color.text};
    font: inherit;
    font-size: ${theme.font.size.md};
    line-height: 1.55;
    transition:
      border-color 140ms ease,
      box-shadow 140ms ease,
      background 140ms ease;
    &::placeholder {
      color: ${theme.color.textFaint};
    }
    &:hover:not(:disabled) {
      border-color: ${hasError ? theme.color.danger : 'rgba(255, 255, 255, 0.14)'};
    }
    &:focus {
      border-color: ${hasError ? theme.color.danger : theme.color.accent};
      background: rgba(255, 255, 255, 0.04);
      box-shadow:
        inset 0 1px 2px rgba(0, 0, 0, 0.35),
        0 0 0 3px ${hasError ? theme.color.dangerSoft : theme.color.accentSoft};
    }
    &:disabled {
      color: ${theme.color.textMuted};
      cursor: not-allowed;
    }
  `;
}
