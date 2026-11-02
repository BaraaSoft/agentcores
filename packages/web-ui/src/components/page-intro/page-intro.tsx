import styled from '@emotion/styled';
import type { ReactNode } from 'react';

/** The opening of a page: a small blue eyebrow, a large headline, and one muted sentence. */
export interface PageIntroProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly children: ReactNode;
}

const Intro = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(3)};
  max-width: 640px;
`;

const Eyebrow = styled.span`
  color: ${({ theme }) => theme.color.accentText};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 11px;
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const Headline = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.display};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  line-height: 1.15;
  letter-spacing: -0.028em;
  text-wrap: balance;
`;

const Lede = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.font.size.base};
  line-height: 1.6;
  text-wrap: pretty;
`;

/** The headline block at the top of a page's content. */
export function PageIntro({ eyebrow, title, children }: PageIntroProps) {
  return (
    <Intro>
      <Eyebrow>{eyebrow}</Eyebrow>
      <Headline>{title}</Headline>
      <Lede>{children}</Lede>
    </Intro>
  );
}
