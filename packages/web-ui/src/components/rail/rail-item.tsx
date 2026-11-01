import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { RailTooltip } from './rail-tooltip';

/** One icon button on the rail. The parent decides which item is active and what a select does. */
export interface RailItemProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly active: boolean;
  readonly onSelect: () => void;
}

const ACTIVE_LAYOUT_ID = 'rail-active-item';
const ICON_SIZE = 24;
const ICON_STROKE = 1.65;

const Item = styled.li`
  position: relative;
`;

const Button = styled.button<{ active: boolean }>`
  position: relative;
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  padding: 0;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: transparent;
  color: ${({ theme, active }) => (active ? theme.color.text : theme.color.textMuted)};
  cursor: pointer;
  transition: color 140ms ease, background-color 140ms ease;
  &:hover {
    color: ${({ theme }) => theme.color.text};
    background: ${({ theme, active }) => (active ? 'transparent' : theme.color.hover)};
  }
  svg {
    position: relative;
  }
`;

const ActivePill = styled(motion.span)`
  position: absolute;
  inset: 0;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.035));
  box-shadow:
    inset 0 1px 0 ${({ theme }) => theme.glass.highlight},
    inset 0 0 0 1px ${({ theme }) => theme.glass.edge},
    0 4px 14px -6px rgba(0, 0, 0, 0.8);
`;

const ActiveBar = styled(motion.span)`
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: -12px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: ${({ theme }) => theme.color.accent};
  box-shadow: 0 0 12px ${({ theme }) => theme.color.accent};
`;

/** An icon button with a hover tooltip. The active marker slides between items. */
export function RailItem({ icon: Icon, label, active, onSelect }: RailItemProps) {
  const theme = useTheme();
  const [hinted, setHinted] = useState(false);
  return (
    <Item onMouseEnter={() => setHinted(true)} onMouseLeave={() => setHinted(false)}>
      <Button
        type="button"
        active={active}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        onClick={onSelect}
        onFocus={() => setHinted(true)}
        onBlur={() => setHinted(false)}
      >
        {active && <ActivePill layoutId={ACTIVE_LAYOUT_ID} transition={theme.motion.spring} />}
        {active && <ActiveBar layoutId={`${ACTIVE_LAYOUT_ID}-bar`} transition={theme.motion.spring} />}
        <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} />
      </Button>
      <RailTooltip label={label} visible={hinted} />
    </Item>
  );
}
