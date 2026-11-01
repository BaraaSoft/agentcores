import styled from '@emotion/styled';
import { motion, useReducedMotion } from 'framer-motion';

const RING_COUNT = 3;
const RING_DURATION_S = 3.2;

const Ring = styled(motion.span)`
  position: absolute;
  inset: 0;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.color.live};
  pointer-events: none;
`;

/** Soft rings that grow out of a tile and fade, like a radar that waits for a signal. */
export function PulseRings() {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;
  return (
    <>
      {Array.from({ length: RING_COUNT }, (_, index) => (
        <Ring
          key={index}
          aria-hidden
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: [0, 0.45, 0], scale: [1, 1.9] }}
          transition={{
            duration: RING_DURATION_S,
            ease: 'easeOut',
            repeat: Infinity,
            delay: (index * RING_DURATION_S) / RING_COUNT,
          }}
        />
      ))}
    </>
  );
}
