import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';

/** Whether the board shows live work, paused work, or cannot reach the agent. */
export interface LiveIndicatorProps {
  readonly state: 'live' | 'paused' | 'offline' | 'connecting';
  readonly label: string;
  readonly detail?: string;
}

const Pill = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  height: 30px;
  padding: 0 ${({ theme }) => theme.space(3)};
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    inset 0 0 0 1px rgba(255, 255, 255, 0.07);
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
`;

const DotWrap = styled.span`
  position: relative;
  display: grid;
  place-items: center;
  width: 8px;
  height: 8px;
`;

const Dot = styled.span<{ dotColor: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ dotColor }) => dotColor};
  box-shadow: 0 0 8px ${({ dotColor }) => dotColor};
`;

const Ripple = styled(motion.span)<{ dotColor: string }>`
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid ${({ dotColor }) => dotColor};
`;

const Detail = styled.span`
  color: ${({ theme }) => theme.color.textMuted};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 11px;
  font-weight: ${({ theme }) => theme.font.weight.regular};
`;

/** A glossy pill with a status dot that ripples while the agent works. */
export function LiveIndicator({ state, label, detail }: LiveIndicatorProps) {
  const theme = useTheme();
  const colors = { live: theme.color.live, paused: theme.color.warning, offline: theme.color.danger, connecting: theme.color.textMuted };
  const dotColor = colors[state];
  return (
    <Pill role="status">
      <DotWrap>
        {state === 'live' && (
          <Ripple dotColor={dotColor} animate={{ scale: [1, 2.6], opacity: [0.7, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }} />
        )}
        <Dot dotColor={dotColor} />
      </DotWrap>
      {label}
      {detail !== undefined && <Detail>{detail}</Detail>}
    </Pill>
  );
}
