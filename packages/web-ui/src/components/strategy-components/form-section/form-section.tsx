import styled from '@emotion/styled';
import type { ReactNode } from 'react';

/** One numbered part of the form: its heading on the left and its fields on the right. */
export interface FormSectionProps {
  readonly index: string;
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}

const Section = styled.section`
  display: grid;
  grid-template-columns: ${({ theme }) => theme.layout.formHeadWidth} minmax(0, 1fr);
  gap: ${({ theme }) => theme.space(10)};
  padding: ${({ theme }) => theme.space(8)} 0;
  border-top: 1px solid ${({ theme }) => theme.color.border};
  @media (max-width: 1180px) {
    grid-template-columns: minmax(0, 1fr);
    gap: ${({ theme }) => theme.space(5)};
  }
`;

const Head = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
`;

const Index = styled.span`
  color: ${({ theme }) => theme.color.accentText};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: 0.08em;
`;

const Title = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: -0.015em;
`;

const Description = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: 1.6;
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(6)};
  min-width: 0;
`;

/** A form section with a mono number, a title, and one sentence that says what the fields are for. */
export function FormSection({ index, title, description, children }: FormSectionProps) {
  return (
    <Section>
      <Head>
        <Index>{index}</Index>
        <Title>{title}</Title>
        <Description>{description}</Description>
      </Head>
      <Body>{children}</Body>
    </Section>
  );
}
