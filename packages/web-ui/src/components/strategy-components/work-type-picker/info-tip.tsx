import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { AnimatePresence, motion } from 'framer-motion';
import { Info } from 'lucide-react';
import { useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { glassSurface } from '../../../theme/glass-surface';

/** A small info button that explains a choice in a glass bubble while it is hovered or focused. */
export interface InfoTipProps {
  readonly label: string;
  readonly text: string;
}

const BUBBLE_WIDTH = 272;
const GAP = 10;
const EDGE = 8;
/** Room the bubble needs above the icon; with less, it opens below. */
const ROOM_ABOVE = 140;

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
  position: fixed;
  z-index: 1000;
  width: ${BUBBLE_WIDTH}px;
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

/** Places the bubble next to the icon and keeps it inside the window, above the icon when there is room. */
function placeBubble(icon: DOMRect): CSSProperties {
  const left = Math.min(Math.max(icon.right + EDGE - BUBBLE_WIDTH, EDGE), window.innerWidth - BUBBLE_WIDTH - EDGE);
  return icon.top >= ROOM_ABOVE ? { left, bottom: window.innerHeight - icon.top + GAP } : { left, top: icon.bottom + GAP };
}

/**
 * Shows `text` next to the icon. The bubble renders on the page body, so a panel that clips its content cannot cut
 * it off. The click does not reach the card behind it.
 */
export function InfoTip({ label, text }: InfoTipProps) {
  const theme = useTheme();
  const tipId = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [placement, setPlacement] = useState<CSSProperties | null>(null);
  const open = () => {
    const icon = anchorRef.current?.getBoundingClientRect();
    if (icon !== undefined) setPlacement(placeBubble(icon));
  };
  const close = () => setPlacement(null);
  return (
    <Anchor ref={anchorRef} onMouseEnter={open} onMouseLeave={close}>
      <Trigger
        type="button"
        aria-label={label}
        aria-describedby={placement !== null ? tipId : undefined}
        onFocus={open}
        onBlur={close}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <Info size={15} strokeWidth={2} aria-hidden />
      </Trigger>
      {createPortal(
        <AnimatePresence>
          {placement !== null && (
            <Bubble
              id={tipId}
              role="tooltip"
              style={placement}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={theme.motion.fast}
            >
              {text}
            </Bubble>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </Anchor>
  );
}
