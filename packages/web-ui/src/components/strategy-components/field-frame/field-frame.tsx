import styled from '@emotion/styled';
import type { ReactNode } from 'react';

/** A labelled form control: its label, an optional note on the right, the control, and a hint or an error. */
export interface FieldFrameProps {
  readonly label: string;
  readonly htmlFor: string;
  readonly aside?: ReactNode;
  readonly hint?: string;
  readonly error?: string;
  readonly children: ReactNode;
}

const Frame = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
  min-width: 0;
`;

const Top = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(3)};
`;

const Label = styled.label`
  color: ${({ theme }) => theme.color.text};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
`;

const Aside = styled.span`
  color: ${({ theme }) => theme.color.textFaint};
  font-size: ${({ theme }) => theme.font.size.xs};
`;

const Note = styled.p<{ isError: boolean }>`
  margin: 0;
  color: ${({ theme, isError }) => (isError ? theme.color.danger : theme.color.textFaint)};
  font-size: ${({ theme }) => theme.font.size.xs};
  line-height: 1.5;
`;

/** Lays out one field. The control itself comes in as children, so any input fits. */
export function FieldFrame({ label, htmlFor, aside, hint, error, children }: FieldFrameProps) {
  const note = error ?? hint;
  return (
    <Frame>
      <Top>
        <Label htmlFor={htmlFor}>{label}</Label>
        {aside !== undefined && <Aside>{aside}</Aside>}
      </Top>
      {children}
      {note !== undefined && (
        <Note isError={error !== undefined} id={`${htmlFor}-note`}>
          {note}
        </Note>
      )}
    </Frame>
  );
}
