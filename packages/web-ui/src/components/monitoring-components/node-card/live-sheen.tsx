import styled from '@emotion/styled';
import { motion, useReducedMotion } from 'framer-motion';

const Clip = styled.span`
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
`;

const Sheen = styled(motion.span)`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 40%;
  background: linear-gradient(100deg, transparent 0%, rgba(76, 183, 130, 0.1) 50%, transparent 100%);
`;

/** A soft green light that sweeps across a card while its work runs. */
export function LiveSheen() {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;
  return (
    <Clip aria-hidden>
      <Sheen initial={{ left: '-40%' }} animate={{ left: '110%' }} transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.8 }} />
    </Clip>
  );
}
