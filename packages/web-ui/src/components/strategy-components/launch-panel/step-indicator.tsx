import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import type { LaunchStepStatus } from './launch-step-status';

/** The round marker of one launch step. */
export interface StepIndicatorProps {
  readonly number: number;
  readonly status: LaunchStepStatus;
}

const SIZE = 30;

const Disc = styled(motion.span)`
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  width: ${SIZE}px;
  height: ${SIZE}px;
  border-radius: 50%;
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
`;

const Spinner = styled(motion.span)`
  position: absolute;
  inset: -1px;
  border: 2px solid transparent;
  border-top-color: ${({ theme }) => theme.color.accent};
  border-right-color: ${({ theme }) => theme.color.accent};
  border-radius: 50%;
`;

const Glyph = styled(motion.span)`
  display: grid;
  place-items: center;
`;

/** A numbered ring while waiting, a spinning blue arc while running, a green tick when done, and a red cross on failure. */
export function StepIndicator({ number, status }: StepIndicatorProps) {
  const theme = useTheme();
  const look = {
    waiting: { background: 'rgba(255, 255, 255, 0.03)', color: theme.color.textFaint, boxShadow: `inset 0 0 0 1px ${theme.color.borderStrong}` },
    running: { background: theme.color.accentSoft, color: theme.color.accentText, boxShadow: `inset 0 0 0 1px rgba(0, 129, 251, 0.35)` },
    done: { background: theme.color.live, color: '#04140C', boxShadow: `0 0 0 4px ${theme.color.liveSoft}` },
    failed: { background: theme.color.danger, color: '#fff', boxShadow: `0 0 0 4px ${theme.color.dangerSoft}` },
  }[status];
  return (
    <Disc animate={look} transition={theme.motion.fast} aria-hidden>
      {status === 'running' && <Spinner animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} />}
      <AnimatePresence mode="wait" initial={false}>
        <Glyph key={status === 'done' || status === 'failed' ? status : 'number'} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={theme.motion.spring}>
          {status === 'done' ? <Check size={15} strokeWidth={3} /> : status === 'failed' ? <X size={15} strokeWidth={3} /> : number}
        </Glyph>
      </AnimatePresence>
    </Disc>
  );
}
