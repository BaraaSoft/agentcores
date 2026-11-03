import styled from '@emotion/styled';
import type { ReactNode } from 'react';
import { glassSurface } from '../../theme/glass-surface';

/** The slots of the rail: the brand at the top, the main items, and the items pinned to the bottom. */
export interface RailProps {
  readonly brand: ReactNode;
  readonly items: ReactNode;
  readonly footer: ReactNode;
  readonly label: string;
}

const Bar = styled.nav`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: ${({ theme }) => theme.layout.railWidth};
  margin: ${({ theme }) => theme.layout.pageInset};
  padding: ${({ theme }) => theme.space(4)} 0;
  border-radius: ${({ theme }) => theme.radius.lg};
  ${({ theme }) => glassSurface(theme, 'deep')};
`;

const Brand = styled.div`
  position: relative;
  display: grid;
  place-items: center;
  height: 36px;
  margin-bottom: ${({ theme }) => theme.space(6)};
  filter: grayscale(1);
`;

const Group = styled.ul`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(5)};
  margin: 0;
  padding: 0;
  margin-top: ${({ theme }) => theme.space(8)};
  list-style: none;
  & > li + li::before {
    content: '';
    position: absolute;
    top: calc(${({ theme }) => theme.space(5)} / -2);
    left: 8px;
    right: 8px;
    height: 1px;
    background: linear-gradient(90deg, transparent, ${({ theme }) => theme.glass.highlight}, transparent);
  }
`;

const Spacer = styled.div`
  flex: 1;
`;

/** The vertical glass bar on the left of the app. It only lays out what it is given. */
export function Rail({ brand, items, footer, label }: RailProps) {
  return (
    <Bar aria-label={label}>
      <Brand>{brand}</Brand>
      <Group>{items}</Group>
      <Spacer />
      <Group>{footer}</Group>
    </Bar>
  );
}
