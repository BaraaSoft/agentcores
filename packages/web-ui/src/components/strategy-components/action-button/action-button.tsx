import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import { LoaderCircle, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** A button in one of two weights: `primary` for the main action, `quiet` for a secondary one. */
export interface ActionButtonProps {
  readonly children: ReactNode;
  readonly onClick: () => void;
  readonly variant?: 'primary' | 'quiet';
  readonly icon?: LucideIcon;
  readonly isBusy?: boolean;
  readonly isDisabled?: boolean;
}

const Button = styled(motion.button)<{ variant: 'primary' | 'quiet' }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space(2)};
  width: 100%;
  height: 46px;
  padding: 0 ${({ theme }) => theme.space(5)};
  overflow: hidden;
  border: none;
  border-radius: ${({ theme }) => theme.radius.lg};
  font: inherit;
  font-size: ${({ theme }) => theme.font.size.md};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: -0.005em;
  cursor: pointer;
  ${({ theme, variant }) =>
    variant === 'primary'
      ? `
        background: linear-gradient(180deg, #1A8FFF 0%, ${theme.color.accent} 45%, ${theme.color.accentStrong} 100%);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.28),
          inset 0 -1px 0 rgba(0, 0, 0, 0.2),
          0 10px 24px -10px ${theme.color.accent};
        color: #fff;
      `
      : `
        background: rgba(255, 255, 255, 0.05);
        box-shadow: inset 0 0 0 1px ${theme.color.borderStrong};
        color: ${theme.color.text};
      `};
  &:hover:not(:disabled) {
    filter: brightness(1.08);
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px ${({ theme }) => theme.color.accentSoft};
  }
  &:disabled {
    cursor: default;
    filter: saturate(0.6);
    opacity: 0.75;
  }
`;

const Spin = styled(motion.span)`
  display: grid;
  place-items: center;
`;

/** A full-width button that presses in slightly, and swaps its icon for a spinner while busy. */
export function ActionButton({ children, onClick, variant = 'primary', icon: Icon, isBusy = false, isDisabled = false }: ActionButtonProps) {
  const theme = useTheme();
  return (
    <Button type="button" variant={variant} onClick={onClick} disabled={isDisabled || isBusy} whileTap={{ scale: 0.985 }} transition={theme.motion.fast} aria-busy={isBusy}>
      {isBusy ? (
        <Spin animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
          <LoaderCircle size={17} strokeWidth={2.25} aria-hidden />
        </Spin>
      ) : (
        Icon !== undefined && <Icon size={17} strokeWidth={2.25} aria-hidden />
      )}
      {children}
    </Button>
  );
}
