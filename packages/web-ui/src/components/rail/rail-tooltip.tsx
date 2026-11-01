import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { AnimatePresence, motion } from 'framer-motion';
import { glassSurface } from '../../theme/glass-surface';

/** The name of a rail item, shown to its right while the item is hovered or focused. */
export interface RailTooltipProps {
  readonly label: string;
  readonly visible: boolean;
}

const Bubble = styled(motion.span)`
  position: absolute;
  top: 50%;
  left: calc(100% + 14px);
  z-index: 10;
  padding: ${({ theme }) => `${theme.space(1.5)} ${theme.space(2.5)}`};
  border-radius: ${({ theme }) => theme.radius.md};
  ${({ theme }) => glassSurface(theme, 'deep')};
  color: ${({ theme }) => theme.color.text};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  white-space: nowrap;
  pointer-events: none;
`;

/** A small label that fades and slides in beside the rail. */
export function RailTooltip({ label, visible }: RailTooltipProps) {
  const theme = useTheme();
  return (
    <AnimatePresence>
      {visible && (
        <Bubble
          role="tooltip"
          initial={{ opacity: 0, x: -4, y: '-50%' }}
          animate={{ opacity: 1, x: 0, y: '-50%' }}
          exit={{ opacity: 0, x: -4, y: '-50%' }}
          transition={theme.motion.fast}
        >
          {label}
        </Bubble>
      )}
    </AnimatePresence>
  );
}
