import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import { LoaderCircle, type LucideIcon } from 'lucide-react';

/** A compact button for a card. `resume` is green, `pause` is amber, and `quiet` is neutral. */
export interface PillButtonProps {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly onClick: () => void;
  readonly tone?: 'resume' | 'pause' | 'quiet';
  readonly isBusy?: boolean;
  readonly isDisabled?: boolean;
  /** Shown on hover, such as why the button is disabled. */
  readonly title?: string;
}

const Button = styled(motion.button)<{ fg: string; bg: string; edge: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space(1.5)};
  min-width: 112px;
  height: 34px;
  padding: 0 ${({ theme }) => theme.space(3.5)};
  border: none;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ bg }) => bg};
  box-shadow: inset 0 0 0 1px ${({ edge }) => edge};
  color: ${({ fg }) => fg};
  font: inherit;
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  white-space: nowrap;
  cursor: pointer;
  transition: filter 140ms ease;
  &:hover:not(:disabled) {
    filter: brightness(1.18);
  }
  &:focus-visible {
    outline: none;
    box-shadow:
      inset 0 0 0 1px ${({ edge }) => edge},
      0 0 0 3px ${({ theme }) => theme.color.accentSoft};
  }
  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
`;

const Spin = styled(motion.span)`
  display: grid;
  place-items: center;
`;

/** A small tinted button. It swaps its icon for a spinner while busy. */
export function PillButton({ label, icon: Icon, onClick, tone = 'quiet', isBusy = false, isDisabled = false, title }: PillButtonProps) {
  const theme = useTheme();
  const palette = {
    resume: { fg: theme.color.live, bg: theme.color.liveSoft, edge: 'rgba(76, 183, 130, 0.32)' },
    pause: { fg: theme.color.warning, bg: theme.color.warningSoft, edge: 'rgba(233, 180, 76, 0.3)' },
    quiet: { fg: theme.color.text, bg: 'rgba(255, 255, 255, 0.04)', edge: theme.color.borderStrong },
  }[tone];
  return (
    <Button
      type="button"
      {...palette}
      onClick={onClick}
      disabled={isDisabled || isBusy}
      aria-busy={isBusy}
      title={title}
      whileTap={{ scale: 0.97 }}
      transition={theme.motion.fast}
    >
      {isBusy ? (
        <Spin animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
          <LoaderCircle size={14} strokeWidth={2.5} aria-hidden />
        </Spin>
      ) : (
        <Icon size={14} strokeWidth={2.5} aria-hidden />
      )}
      {label}
    </Button>
  );
}
