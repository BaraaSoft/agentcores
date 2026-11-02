import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { FieldFrame } from '../field-frame/field-frame';
import { fieldControl } from '../styles/field-control';

/** A multi-line text input with a live character count against its limit. */
export interface TextAreaFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly maxLength: number;
  readonly placeholder?: string;
  readonly hint?: string;
  readonly error?: string;
  readonly rows?: number;
}

/** The share of the limit after which the count turns amber. */
const NEAR_LIMIT = 0.9;

const Area = styled.textarea<{ hasError: boolean }>`
  ${({ theme, hasError }) => fieldControl(theme, hasError)};
  min-height: 180px;
  resize: vertical;
  font-size: ${({ theme }) => theme.font.size.base};
  line-height: 1.65;
`;

const Count = styled.span<{ countColor: string }>`
  color: ${({ countColor }) => countColor};
  font-family: ${({ theme }) => theme.font.mono};
  font-variant-numeric: tabular-nums;
`;

/** A labelled text area. The count sits beside the label, so it never covers the text. */
export function TextAreaField({ id, label, value, onChange, maxLength, placeholder, hint, error, rows = 8 }: TextAreaFieldProps) {
  const theme = useTheme();
  const ratio = value.length / maxLength;
  const countColor = ratio >= 1 ? theme.color.danger : ratio >= NEAR_LIMIT ? theme.color.warning : theme.color.textFaint;
  return (
    <FieldFrame
      label={label}
      htmlFor={id}
      aside={
        <Count countColor={countColor}>
          {value.length.toLocaleString()} / {maxLength.toLocaleString()}
        </Count>
      }
      {...(hint === undefined ? {} : { hint })}
      {...(error === undefined ? {} : { error })}
    >
      <Area
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        hasError={error !== undefined}
        aria-invalid={error !== undefined}
        aria-describedby={hint !== undefined || error !== undefined ? `${id}-note` : undefined}
      />
    </FieldFrame>
  );
}
