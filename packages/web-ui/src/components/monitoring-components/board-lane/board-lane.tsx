import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';

/** One column of the board, such as JOBS. It spans the full height of the board. */
export interface BoardLaneProps {
  readonly label: string;
  readonly count: number;
  readonly x: number;
  readonly width: number;
}

const Lane = styled(motion.div)`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.028) 0%, rgba(255, 255, 255, 0.012) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    inset 0 0 0 1px rgba(255, 255, 255, 0.045);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => `${theme.space(3.5)} ${theme.space(4)}`};
`;

const Label = styled.span`
  color: ${({ theme }) => theme.color.textMuted};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 11px;
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const Count = styled.span`
  color: ${({ theme }) => theme.color.textFaint};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 11px;
`;

/** A tall, faint panel with an uppercase label, behind the cards of one level of work. */
export function BoardLane({ label, count, x, width }: BoardLaneProps) {
  const theme = useTheme();
  return (
    <Lane initial={{ opacity: 0, x }} animate={{ opacity: 1, x }} transition={theme.motion.spring} style={{ width }}>
      <Header>
        <Label>{label}</Label>
        <Count>{count}</Count>
      </Header>
    </Lane>
  );
}
