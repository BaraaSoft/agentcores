import styled from '@emotion/styled';
import type { ReactNode } from 'react';

/** The main column of a page, and the panel beside it. */
export interface SidePanelLayoutProps {
  readonly main: ReactNode;
  readonly aside: ReactNode;
}

const Page = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) ${({ theme }) => theme.layout.sidePanelWidth};
  align-items: start;
  gap: ${({ theme }) => theme.space(12)};
  width: 100%;
  max-width: 1360px;
  margin: 0 auto;
  padding: ${({ theme }) => `${theme.space(10)} ${theme.space(12)} ${theme.space(16)}`};
  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 1fr);
    gap: ${({ theme }) => theme.space(8)};
    padding: ${({ theme }) => `${theme.space(8)} ${theme.space(6)} ${theme.space(12)}`};
  }
`;

const Main = styled.div`
  min-width: 0;
`;

/** A wide main column with a fixed-width side panel. Below 1100 px the panel drops under the main column. */
export function SidePanelLayout({ main, aside }: SidePanelLayoutProps) {
  return (
    <Page>
      <Main>{main}</Main>
      {aside}
    </Page>
  );
}
