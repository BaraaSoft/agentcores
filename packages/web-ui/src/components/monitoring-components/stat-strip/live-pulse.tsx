import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';

/** Props for {@link LivePulse}. */
export interface LivePulseProps {
  readonly active: boolean;
}

const SIZE = 28;
const RIPPLE_DELAYS = [0, 0.8] as const;

const Frame = styled.span`
  position: relative;
  display: inline-grid;
  place-items: center;
  flex: none;
  width: ${SIZE}px;
  height: ${SIZE}px;
`;

const Ripple = styled(motion.span)<{ dotColor: string }>`
  position: absolute;
  inset: 0;
  border: 1.5px solid ${({ dotColor }) => dotColor};
  border-radius: 50%;
`;

const Core = styled.span<{ dotColor: string; dotGlow: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ dotColor }) => dotColor};
  box-shadow: 0 0 10px ${({ dotGlow }) => dotGlow};
`;

const Ring = styled.span`
  position: absolute;
  inset: 0;
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
`;

/** A small radar mark: a glowing core with ripples while work runs, and a quiet ring when it does not. */
export function LivePulse({ active }: LivePulseProps) {
  const theme = useTheme();
  return (
    <Frame aria-hidden>
      {active ? (
        RIPPLE_DELAYS.map((delay) => (
          <Ripple
            key={delay}
            dotColor={theme.color.live}
            initial={{ scale: 0.35, opacity: 0.9 }}
            animate={{ scale: 1, opacity: 0 }}
            transition={{ duration: 1.6, delay, repeat: Infinity, ease: 'easeOut' }}
          />
        ))
      ) : (
        <Ring />
      )}
      <Core dotColor={active ? theme.color.live : 'rgba(255, 255, 255, 0.16)'} dotGlow={active ? theme.color.liveSoft : 'transparent'} />
    </Frame>
  );
}
