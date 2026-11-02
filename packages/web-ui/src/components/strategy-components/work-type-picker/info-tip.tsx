import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { AnimatePresence, motion } from 'framer-motion';
import { Info } from 'lucide-react';
import { useId, useState } from 'react';
import { glassSurface } from '../../../theme/glass-surface';

/** A small info button that explains a choice in a glass bubble while it is hovered or focused. */
export interface InfoTipProps {
  readonly label: string;
  readonly text: string;
}

const Anchor = styled.span`
  position: relative;
  display: inline-flex;
  vertical-align: middle;
`;

const Trigger = styled.button`
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.color.textFaint};
  cursor: help;
  transition:
    color 140ms ease,
    background 140ms ease;
  &:hover,
  &:focus-visible {
    background: ${({ theme }) => theme.color.selected};
    color: ${({ theme }) => theme.color.text};
    outline: none;
  }
`;

const Bubble = styled(motion.span)`
  position: absolute;
  right: -8px;
  bottom: calc(100% + 10px);
  z-index: 20;
  width: 272px;
  padding: ${({ theme }) => `${theme.space(3)} ${theme.space(3.5)}`};
  border-radius: ${({ theme }) => theme.radius.lg};
  ${({ theme }) => glassSurface(theme, 'deep')};
  color: ${({ theme }) => theme.color.text};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.regular};
  line-height: 1.55;
  text-align: left;
  pointer-events: none;
`;

/** Shows `text` above the icon. The click does not reach the card behind it. */
export function InfoTip({ label, text }: InfoTipProps) {
  const theme = useTheme();
  const tipId = useId();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Anchor onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
      <Trigger
        type="button"
        aria-label={label}
        aria-describedby={isOpen ? tipId : undefined}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <Info size={15} strokeWidth={2} aria-hidden />
      </Trigger>
      <AnimatePresence>
        {isOpen && (
          <Bubble id={tipId} role="tooltip" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={theme.motion.fast}>
            {text}
          </Bubble>
        )}
      </AnimatePresence>
    </Anchor>
  );
}
