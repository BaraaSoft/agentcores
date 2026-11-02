import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { FieldFrame } from '../field-frame/field-frame';

/** A whole number chosen with minus and plus buttons, between `min` and `max`. */
export interface NumberStepperProps {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly unit: string;
  readonly onChange: (value: number) => void;
  readonly hint?: string;
}

const Control = styled.div`
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  padding: ${({ theme }) => theme.space(1)};
  border: 1px solid ${({ theme }) => theme.color.borderStrong};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.025);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
`;

const Step = styled.button`
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: ${({ theme }) => theme.radius.md};
  background: transparent;
  color: ${({ theme }) => theme.color.textMuted};
  cursor: pointer;
  transition:
    background 140ms ease,
    color 140ms ease;
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.color.selected};
    color: ${({ theme }) => theme.color.text};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.color.accent};
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;

const Value = styled.output`
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  gap: ${({ theme }) => theme.space(1.5)};
  min-width: 112px;
  overflow: hidden;
`;

const Digits = styled(motion.span)`
  display: inline-block;
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  font-variant-numeric: tabular-nums;
`;

const Unit = styled.span`
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.font.size.sm};
`;

/** A compact counter: the number rolls in from the side it moves towards. */
export function NumberStepper({ id, label, value, min, max, unit, onChange, hint }: NumberStepperProps) {
  const theme = useTheme();
  return (
    <FieldFrame label={label} htmlFor={id} {...(hint === undefined ? {} : { hint })}>
      <Control>
        <Step type="button" aria-label={`Fewer ${unit}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
          <Minus size={16} strokeWidth={2.25} aria-hidden />
        </Step>
        <Value id={id} aria-live="polite">
          <Digits key={value} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={theme.motion.spring}>
            {value}
          </Digits>
          <Unit>{unit}</Unit>
        </Value>
        <Step type="button" aria-label={`More ${unit}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
          <Plus size={16} strokeWidth={2.25} aria-hidden />
        </Step>
      </Control>
    </FieldFrame>
  );
}
