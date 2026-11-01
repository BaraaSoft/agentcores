import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';

/** The steps to show: how many are finished, how many exist, and whether the current one runs now. */
export interface StepDotsProps {
  readonly done: number;
  readonly total: number;
  readonly currentLive: boolean;
}

const Row = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const Dot = styled(motion.span)<{ dotFill: string; dotGlow: string }>`
  width: 14px;
  height: 4px;
  border-radius: 2px;
  background: ${({ dotFill }) => dotFill};
  box-shadow: ${({ dotGlow }) => dotGlow};
`;

/** One short bar per step: white when finished, green when it runs now, faint when it is still to come. */
export function StepDots({ done, total, currentLive }: StepDotsProps) {
  const theme = useTheme();
  return (
    <Row aria-hidden>
      {Array.from({ length: total }, (_, index) => {
        const current = index === done && currentLive;
        const fill = index < done ? theme.color.text : current ? theme.color.live : 'rgba(255, 255, 255, 0.1)';
        const glow = current ? `0 0 8px ${theme.color.live}` : 'none';
        return (
          <Dot
            key={index}
            dotFill={fill}
            dotGlow={glow}
            animate={current ? { opacity: [1, 0.45, 1] } : { opacity: 1 }}
            transition={current ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : theme.motion.fast}
          />
        );
      })}
    </Row>
  );
}
