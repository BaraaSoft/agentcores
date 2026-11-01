import styled from '@emotion/styled';
import type { LucideIcon } from 'lucide-react';

/** The lead block of the strip: what the agent works on, and how. */
export interface StatHeroProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly title: string;
  readonly meta: string;
}

const Hero = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3.5)};
  min-width: 0;
  padding: 0 ${({ theme }) => theme.space(5)};
`;

const Tile = styled.span`
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: ${({ theme }) => theme.radius.lg};
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.04) 48%, rgba(255, 255, 255, 0.02) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.28),
    inset 0 -1px 0 rgba(255, 255, 255, 0.04),
    0 8px 20px -8px rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(12px) saturate(160%);
  color: ${({ theme }) => theme.color.text};
`;

const Text = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`;

const Label = styled.span`
  color: ${({ theme }) => theme.color.textMuted};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10px;
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const Title = styled.span`
  overflow: hidden;
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: -0.015em;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Meta = styled.span`
  overflow: hidden;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.font.size.xs};
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/** A clear glass icon tile beside the Strategy name and its work type. */
export function StatHero({ icon: Icon, label, title, meta }: StatHeroProps) {
  return (
    <Hero>
      <Tile aria-hidden>
        <Icon size={18} strokeWidth={2} />
      </Tile>
      <Text>
        <Label>{label}</Label>
        <Title title={title}>{title}</Title>
        <Meta>{meta}</Meta>
      </Text>
    </Hero>
  );
}
