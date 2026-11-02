import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';

/** One choice of the filter, with how many items it shows. */
export interface SegmentedFilterOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly count: number;
}

/** A row of choices where exactly one is on, such as All, Running, and Paused. */
export interface SegmentedFilterProps<T extends string> {
  readonly label: string;
  readonly options: readonly SegmentedFilterOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}

const Track = styled.div`
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.03);
  box-shadow: inset 0 0 0 1px ${({ theme }) => theme.color.border};
`;

const Segment = styled.button<{ isSelected: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  height: 30px;
  padding: 0 ${({ theme }) => theme.space(3)};
  border: none;
  border-radius: ${({ theme }) => theme.radius.md};
  background: transparent;
  color: ${({ theme, isSelected }) => (isSelected ? theme.color.text : theme.color.textMuted)};
  font: inherit;
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  cursor: pointer;
  transition: color 140ms ease;
  &:hover {
    color: ${({ theme }) => theme.color.text};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.color.accentSoft};
  }
  & > span {
    position: relative;
  }
`;

const Highlight = styled(motion.span)`
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.04));
  box-shadow:
    inset 0 1px 0 ${({ theme }) => theme.glass.highlight},
    inset 0 0 0 1px ${({ theme }) => theme.glass.edge};
`;

const Count = styled.span<{ isSelected: boolean }>`
  min-width: 18px;
  padding: 1px 5px;
  border-radius: 999px;
  background: ${({ theme, isSelected }) => (isSelected ? theme.color.accentSoft : 'rgba(255, 255, 255, 0.05)')};
  color: ${({ theme, isSelected }) => (isSelected ? theme.color.accentText : theme.color.textFaint)};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  text-align: center;
`;

/** A pill track whose highlight slides to the chosen segment. Each segment shows its count. */
export function SegmentedFilter<T extends string>({ label, options, value, onChange }: SegmentedFilterProps<T>) {
  const theme = useTheme();
  return (
    <Track role="tablist" aria-label={label}>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Segment key={option.value} type="button" role="tab" aria-selected={isSelected} isSelected={isSelected} onClick={() => onChange(option.value)}>
            {isSelected && <Highlight layoutId={`segmented-${label}`} transition={theme.motion.spring} />}
            <span>{option.label}</span>
            <Count isSelected={isSelected}>{option.count}</Count>
          </Segment>
        );
      })}
    </Track>
  );
}
