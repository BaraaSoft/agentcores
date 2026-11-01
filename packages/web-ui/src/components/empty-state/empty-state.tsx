import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { PulseRings } from './pulse-rings';

/** What an empty page says, and whether its icon pulses to show the agent is listening. */
export interface EmptyStateProps {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
  readonly pulsing?: boolean;
  readonly action?: ReactNode;
}

const ICON_SIZE = 20;
const ICON_STROKE = 1.6;

const Frame = styled.div`
  display: grid;
  place-items: center;
  flex: 1;
  padding: ${({ theme }) => theme.space(10)};
`;

const Body = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 360px;
  text-align: center;
`;

const Tile = styled.div<{ pulsing: boolean }>`
  position: relative;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  margin-bottom: ${({ theme }) => theme.space(5)};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: linear-gradient(180deg, ${({ theme }) => theme.color.surfaceRaised}, ${({ theme }) => theme.color.surface});
  box-shadow:
    inset 0 0 0 1px ${({ theme }) => theme.color.borderStrong},
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  color: ${({ theme, pulsing }) => (pulsing ? theme.color.live : theme.color.textMuted)};
`;

const Title = styled.h2`
  margin: 0 0 ${({ theme }) => theme.space(1.5)};
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  letter-spacing: -0.01em;
`;

const Description = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.font.size.md};
`;

const Action = styled.div`
  margin-top: ${({ theme }) => theme.space(5)};
`;

/** A calm, centred placeholder for a page that has nothing to show yet. */
export function EmptyState({ icon: Icon, title, description, pulsing = false, action }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <Frame>
      <Body initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={theme.motion.spring}>
        <Tile pulsing={pulsing}>
          {pulsing && <PulseRings />}
          <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} />
        </Tile>
        <Title>{title}</Title>
        <Description>{description}</Description>
        {action && <Action>{action}</Action>}
      </Body>
    </Frame>
  );
}
