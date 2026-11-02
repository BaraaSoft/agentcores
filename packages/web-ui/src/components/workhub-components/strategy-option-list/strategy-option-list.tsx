import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import type { KeyboardEvent } from 'react';

/** One Strategy the owner can pick. */
export interface StrategyOption {
  readonly id: string;
  readonly name: string;
  /** Such as "one-off · up to 3 iterations". */
  readonly workTypeLine: string;
  /** Such as "Runs on Macbook" or "No workflow yet". */
  readonly usageLine: string;
  readonly isRunning: boolean;
}

/** A scrolling list of Strategies where exactly one can be picked. */
export interface StrategyOptionListProps {
  readonly label: string;
  readonly options: readonly StrategyOption[];
  readonly value: string | null;
  readonly onChange: (strategyId: string) => void;
}

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 296px;
  margin: 0 -${({ theme }) => theme.space(2)};
  padding: 2px ${({ theme }) => theme.space(2)};
  overflow-y: auto;
  scrollbar-width: thin;
`;

const Option = styled.div<{ isSelected: boolean }>`
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => `${theme.space(2.5)} ${theme.space(3)}`};
  border-radius: ${({ theme }) => theme.radius.lg};
  cursor: pointer;
  transition: background 140ms ease;
  &:hover {
    background: ${({ theme, isSelected }) => (isSelected ? 'transparent' : theme.color.hover)};
  }
  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 1px ${({ theme }) => theme.color.accent};
  }
  & > * {
    position: relative;
  }
`;

const Highlight = styled(motion.span)`
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: ${({ theme }) => theme.color.accentSoft};
  box-shadow: inset 0 0 0 1px rgba(0, 129, 251, 0.45);
`;

const Radio = styled.span<{ isSelected: boolean }>`
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1.5px ${({ theme, isSelected }) => (isSelected ? theme.color.accent : theme.color.borderStrong)};
  &::after {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ theme }) => theme.color.accent};
    transform: scale(${({ isSelected }) => (isSelected ? 1 : 0)});
    transition: transform 160ms ease;
  }
`;

const Text = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const Name = styled.span`
  overflow: hidden;
  color: ${({ theme }) => theme.color.text};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Line = styled.span`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
  overflow: hidden;
  color: ${({ theme }) => theme.color.textFaint};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  white-space: nowrap;
`;

const LiveDot = styled.span`
  flex-shrink: 0;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.live};
  box-shadow: 0 0 6px ${({ theme }) => theme.color.live};
`;

/** Rows with a radio dot. A blue frame slides to the picked row, and the arrow keys move the pick. */
export function StrategyOptionList({ label, options, value, onChange }: StrategyOptionListProps) {
  const theme = useTheme();
  const move = (event: KeyboardEvent<HTMLDivElement>, index: number) => {
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = options[(index + step + options.length) % options.length];
    if (next === undefined) return;
    onChange(next.id);
    (event.currentTarget.parentElement?.children[(index + step + options.length) % options.length] as HTMLElement | undefined)?.focus();
  };
  return (
    <List role="radiogroup" aria-label={label}>
      {options.map((option, index) => {
        const isSelected = option.id === value;
        return (
          <Option
            key={option.id}
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected || (value === null && index === 0) ? 0 : -1}
            isSelected={isSelected}
            onClick={() => onChange(option.id)}
            onKeyDown={(event) => (event.key === ' ' || event.key === 'Enter' ? (event.preventDefault(), onChange(option.id)) : move(event, index))}
          >
            {isSelected && <Highlight layoutId="strategy-option-highlight" transition={theme.motion.spring} />}
            <Radio isSelected={isSelected} aria-hidden />
            <Text>
              <Name title={option.name}>{option.name}</Name>
              <Line>
                {option.isRunning && <LiveDot aria-hidden />}
                {option.usageLine} · {option.workTypeLine}
              </Line>
            </Text>
          </Option>
        );
      })}
    </List>
  );
}
