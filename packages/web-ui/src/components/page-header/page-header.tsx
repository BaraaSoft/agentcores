import styled from '@emotion/styled';
import type { ReactNode } from 'react';
import { glassSurface } from '../../theme/glass-surface';

/** The title of the page, and optional content for the right side, such as a status or an action. */
export interface PageHeaderProps {
  readonly title: string;
  readonly trailing?: ReactNode;
}

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  height: ${({ theme }) => theme.layout.headerHeight};
  padding: 0 ${({ theme }) => theme.space(7)};
  ${({ theme }) => glassSurface(theme, 'raised')};
`;

const Title = styled.h1`
  position: relative;
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.xl};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  line-height: 1.2;
  letter-spacing: 0.06em;
  background: linear-gradient(180deg, rgba(247, 248, 248, 0.5) 30%, rgba(247, 248, 248, 0.3));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
`;

/** The frosted glass bar at the top of each page. Page content scrolls under it. */
export function PageHeader({ title, trailing }: PageHeaderProps) {
  return (
    <Header>
      <Title>{title}</Title>
      {trailing}
    </Header>
  );
}
