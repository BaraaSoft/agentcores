import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { InfoTip } from './info-tip';

/** One choice of the picker: a short name, a tagline under it, and the full meaning in its tooltip. */
export interface WorkTypeOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly tagline: string;
  readonly description: string;
  readonly icon: LucideIcon;
}

/** A row of cards where exactly one is chosen, like a radio group. */
export interface WorkTypePickerProps<T extends string> {
  readonly label: string;
  readonly options: readonly WorkTypeOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly isDisabled?: boolean;
}

const Group = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space(3)};
  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Card = styled.div<{ isSelected: boolean; isDisabled: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(3)};
  min-height: 132px;
  padding: ${({ theme }) => theme.space(4)};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ isSelected }) => (isSelected ? 'transparent' : 'rgba(255, 255, 255, 0.02)')};
  box-shadow: inset 0 0 0 1px ${({ theme, isSelected }) => (isSelected ? 'transparent' : theme.color.borderStrong)};
  cursor: ${({ isDisabled }) => (isDisabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ isDisabled, isSelected }) => (isDisabled && !isSelected ? 0.5 : 1)};
  outline: none;
  transition:
    background 160ms ease,
    box-shadow 160ms ease;
  &:hover {
    background: ${({ isSelected, isDisabled }) => (isSelected || isDisabled ? undefined : 'rgba(255, 255, 255, 0.04)')};
  }
  &:focus-visible {
    box-shadow:
      inset 0 0 0 1px ${({ theme }) => theme.color.accent},
      0 0 0 3px ${({ theme }) => theme.color.accentSoft};
  }
`;

const Highlight = styled(motion.span)`
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background:
    radial-gradient(120% 90% at 0% 0%, rgba(0, 129, 251, 0.22), transparent 60%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.015));
  box-shadow:
    inset 0 0 0 1px ${({ theme }) => theme.color.accent},
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 10px 30px -14px ${({ theme }) => theme.color.accent};
  pointer-events: none;
`;

const Top = styled.div`
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
`;

const Tile = styled.span<{ isSelected: boolean }>`
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme, isSelected }) => (isSelected ? theme.color.accent : 'rgba(255, 255, 255, 0.06)')};
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, ${({ isSelected }) => (isSelected ? 0.3 : 0.08)});
  color: ${({ theme, isSelected }) => (isSelected ? '#fff' : theme.color.textMuted)};
  transition:
    background 160ms ease,
    color 160ms ease;
`;

const Text = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(1)};
`;

const Name = styled.span`
  font-size: ${({ theme }) => theme.font.size.base};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: -0.01em;
`;

const Tagline = styled.span`
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: 1.45;
`;

/** Cards with an icon, a name, and a tagline. The blue frame slides to the chosen card; the info icon explains each one. */
export function WorkTypePicker<T extends string>({ label, options, value, onChange, isDisabled = false }: WorkTypePickerProps<T>) {
  const theme = useTheme();
  const choose = (next: T) => !isDisabled && onChange(next);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>, index: number) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      choose(options[index]!.value);
      return;
    }
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = options[(index + step + options.length) % options.length]!;
    choose(next.value);
    (event.currentTarget.parentElement?.children[options.indexOf(next)] as HTMLElement | undefined)?.focus();
  };
  return (
    <Group role="radiogroup" aria-label={label} aria-disabled={isDisabled}>
      {options.map((option, index) => {
        const isSelected = option.value === value;
        const Icon = option.icon;
        return (
          <Card
            key={option.value}
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            isSelected={isSelected}
            isDisabled={isDisabled}
            onClick={() => choose(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {isSelected && <Highlight layoutId="work-type-highlight" transition={theme.motion.spring} />}
            <Top>
              <Tile isSelected={isSelected} aria-hidden>
                <Icon size={18} strokeWidth={2} />
              </Tile>
              <InfoTip label={`What ${option.label} means`} text={option.description} />
            </Top>
            <Text>
              <Name>{option.label}</Name>
              <Tagline>{option.tagline}</Tagline>
            </Text>
          </Card>
        );
      })}
    </Group>
  );
}
