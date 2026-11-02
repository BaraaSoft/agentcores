import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';

/** An on and off choice with a label and one line that explains it. */
export interface ToggleSwitchProps {
  readonly label: string;
  readonly description: string;
  readonly isOn: boolean;
  readonly onChange: (isOn: boolean) => void;
}

const Row = styled.button`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space(3)};
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  &:focus-visible {
    outline: none;
  }
  &:focus-visible > span:first-of-type {
    box-shadow: 0 0 0 3px ${({ theme }) => theme.color.accentSoft};
  }
`;

const Track = styled.span<{ isOn: boolean }>`
  position: relative;
  flex-shrink: 0;
  width: 34px;
  height: 20px;
  margin-top: 1px;
  border-radius: 999px;
  background: ${({ theme, isOn }) => (isOn ? theme.color.accent : 'rgba(255, 255, 255, 0.1)')};
  transition: background 160ms ease;
`;

const Knob = styled(motion.span)`
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
`;

const Text = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Label = styled.span`
  color: ${({ theme }) => theme.color.text};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
`;

const Description = styled.span`
  color: ${({ theme }) => theme.color.textFaint};
  font-size: ${({ theme }) => theme.font.size.xs};
  line-height: 1.5;
`;

/** A switch whose knob springs across. The whole row is the click target. */
export function ToggleSwitch({ label, description, isOn, onChange }: ToggleSwitchProps) {
  const theme = useTheme();
  return (
    <Row type="button" role="switch" aria-checked={isOn} onClick={() => onChange(!isOn)}>
      <Track isOn={isOn} aria-hidden>
        <Knob animate={{ x: isOn ? 14 : 0 }} transition={theme.motion.spring} />
      </Track>
      <Text>
        <Label>{label}</Label>
        <Description>{description}</Description>
      </Text>
    </Row>
  );
}
