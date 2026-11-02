import styled from '@emotion/styled';
import { Search, X } from 'lucide-react';

/** A compact search box with a clear button. */
export interface SearchFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
}

const Box = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  width: 260px;
  max-width: 100%;
  height: 36px;
  padding: 0 ${({ theme }) => theme.space(3)};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.03);
  box-shadow: inset 0 0 0 1px ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.textFaint};
  transition: box-shadow 140ms ease;
  &:focus-within {
    box-shadow:
      inset 0 0 0 1px ${({ theme }) => theme.color.accent},
      0 0 0 3px ${({ theme }) => theme.color.accentSoft};
    color: ${({ theme }) => theme.color.textMuted};
  }
`;

const Input = styled.input`
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.color.text};
  font: inherit;
  font-size: ${({ theme }) => theme.font.size.sm};
  outline: none;
  &::placeholder {
    color: ${({ theme }) => theme.color.textFaint};
  }
`;

const Clear = styled.button`
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  color: ${({ theme }) => theme.color.textMuted};
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.color.text};
  }
`;

/** Filters as the owner types. The X clears it. */
export function SearchField({ label, value, onChange, placeholder }: SearchFieldProps) {
  return (
    <Box>
      <Search size={15} strokeWidth={2} aria-hidden />
      <Input type="search" aria-label={label} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      {value !== '' && (
        <Clear type="button" aria-label="Clear search" onClick={() => onChange('')}>
          <X size={12} strokeWidth={2.5} aria-hidden />
        </Clear>
      )}
    </Box>
  );
}
