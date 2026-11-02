import styled from '@emotion/styled';
import type { ReactNode } from 'react';
import { glassSurface } from '../../../theme/glass-surface';

/** The side panel that builds something new: a heading, a title with one line under it, the fields, and the actions. */
export interface ComposerPanelProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: ReactNode;
  readonly children: ReactNode;
  readonly actions: ReactNode;
  readonly footnote?: string;
}

const Panel = styled.aside`
  position: sticky;
  top: ${({ theme }) => `calc(${theme.layout.headerHeight} + ${theme.space(6)})`};
  z-index: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.lg};
  ${({ theme }) => glassSurface(theme, 'raised')};
  & > * {
    position: relative;
  }
`;

const Block = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(5)};
  padding: ${({ theme }) => `${theme.space(5)} ${theme.space(6)}`};
  & + & {
    border-top: 1px solid ${({ theme }) => theme.color.border};
  }
`;

const Head = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(1.5)};
`;

const Eyebrow = styled.span`
  color: ${({ theme }) => theme.color.textMuted};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 11px;
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const Title = styled.h2`
  margin: ${({ theme }) => theme.space(1)} 0 0;
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: -0.015em;
`;

const Description = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: 1.55;
`;

const Footnote = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.color.textFaint};
  font-size: ${({ theme }) => theme.font.size.xs};
  line-height: 1.5;
  text-align: center;
`;

/** A sticky glass card in two blocks: the heading with the fields, then the actions. */
export function ComposerPanel({ eyebrow, title, description, children, actions, footnote }: ComposerPanelProps) {
  return (
    <Panel aria-label={title}>
      <Block>
        <Head>
          <Eyebrow>{eyebrow}</Eyebrow>
          <Title>{title}</Title>
          <Description>{description}</Description>
        </Head>
        {children}
      </Block>
      <Block>
        {actions}
        {footnote !== undefined && <Footnote>{footnote}</Footnote>}
      </Block>
    </Panel>
  );
}
