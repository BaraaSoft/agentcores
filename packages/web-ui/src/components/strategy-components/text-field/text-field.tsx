import styled from '@emotion/styled';
import { FieldFrame } from '../field-frame/field-frame';
import { fieldControl } from '../styles/field-control';

/** A one-line text input with its label. `isProminent` makes the text large, for a title. */
export interface TextFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly hint?: string;
  readonly error?: string;
  readonly maxLength?: number;
  readonly isProminent?: boolean;
  readonly inputMode?: 'text' | 'numeric' | 'decimal';
  readonly prefix?: string;
}

const Wrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Prefix = styled.span`
  position: absolute;
  left: ${({ theme }) => theme.space(3.5)};
  color: ${({ theme }) => theme.color.textFaint};
  font-size: ${({ theme }) => theme.font.size.md};
  pointer-events: none;
`;

const Input = styled.input<{ hasError: boolean; isProminent: boolean; hasPrefix: boolean }>`
  ${({ theme, hasError }) => fieldControl(theme, hasError)};
  ${({ theme, isProminent }) =>
    isProminent &&
    `
      padding-top: ${theme.space(3.5)};
      padding-bottom: ${theme.space(3.5)};
      font-size: ${theme.font.size.lg};
      font-weight: ${theme.font.weight.medium};
      letter-spacing: -0.01em;
    `};
  ${({ theme, hasPrefix }) => hasPrefix && `padding-left: ${theme.space(7)};`};
`;

/** A labelled text input that reports each change. */
export function TextField({ id, label, value, onChange, placeholder, hint, error, maxLength, isProminent = false, inputMode, prefix }: TextFieldProps) {
  return (
    <FieldFrame label={label} htmlFor={id} {...(hint === undefined ? {} : { hint })} {...(error === undefined ? {} : { error })}>
      <Wrap>
        {prefix !== undefined && <Prefix aria-hidden>{prefix}</Prefix>}
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          inputMode={inputMode}
          autoComplete="off"
          spellCheck={false}
          hasError={error !== undefined}
          isProminent={isProminent}
          hasPrefix={prefix !== undefined}
          aria-invalid={error !== undefined}
          aria-describedby={hint !== undefined || error !== undefined ? `${id}-note` : undefined}
        />
      </Wrap>
    </FieldFrame>
  );
}
