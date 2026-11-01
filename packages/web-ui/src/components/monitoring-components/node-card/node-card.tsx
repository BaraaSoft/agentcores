import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { StatusBadge } from '../status-badge/status-badge';
import type { StatusTone } from '../types/status-tone';
import { tonePalette } from '../types/tone-palette';
import { CardProgress } from './card-progress';
import { LiveSheen } from './live-sheen';

/** One piece of work on the board, placed at a fixed spot. The parent decides everything it shows. */
export interface NodeCardProps {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly meta: string;
  readonly tone: StatusTone;
  readonly badge: string;
  readonly score?: string;
  readonly progress?: { readonly done: number; readonly total: number };
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly selected: boolean;
  readonly onSelect: () => void;
}

type Palette = ReturnType<typeof tonePalette>;

const Card = styled(motion.button)<{ palette: Palette; tone: StatusTone; isSelected: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  padding: 0 ${({ theme }) => theme.space(3.5)};
  border: 0;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: linear-gradient(180deg, #17181b 0%, #111214 100%);
  color: ${({ theme }) => theme.color.text};
  text-align: left;
  cursor: pointer;
  opacity: ${({ tone }) => (tone === 'muted' ? 0.5 : 1)};
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    inset 0 0 0 1px ${({ palette, tone, theme }) => (tone === 'waiting' || tone === 'done' ? theme.color.borderStrong : palette.border)},
    ${({ isSelected, theme }) => (isSelected ? `0 0 0 2px ${theme.color.accent},` : '')}
    ${({ tone, palette }) => (tone === 'live' ? `0 0 28px -8px ${palette.fg},` : '')}
    0 10px 24px -14px rgba(0, 0, 0, 0.9);
  transition: box-shadow 200ms ease, transform 200ms ease;
  &:hover {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.07),
      inset 0 0 0 1px ${({ palette, tone }) => (tone === 'waiting' || tone === 'done' ? 'rgba(255, 255, 255, 0.2)' : palette.fg)},
      ${({ isSelected, theme }) => (isSelected ? `0 0 0 2px ${theme.color.accent},` : '')}
      0 14px 30px -14px rgba(0, 0, 0, 0.95);
  }
`;

const IconTile = styled.span<{ palette: Palette; tone: StatusTone }>`
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ palette, tone }) => (tone === 'waiting' || tone === 'muted' || tone === 'done' ? 'rgba(255, 255, 255, 0.05)' : palette.bg)};
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
  color: ${({ palette, tone, theme }) => (tone === 'done' ? theme.color.textMuted : palette.fg)};
`;

const Text = styled.span`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`;

const Title = styled.span`
  display: -webkit-box;
  overflow: hidden;
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  line-height: 1.35;
  letter-spacing: -0.005em;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
`;

const Meta = styled.span`
  overflow: hidden;
  color: ${({ theme }) => theme.color.textMuted};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Badges = styled.span`
  position: absolute;
  top: -9px;
  right: 12px;
  display: flex;
  gap: 6px;
`;

const ICON_SIZE = 16;

/** A glossy card with an icon, a title, a mono meta line, and status chips on its top edge. */
export function NodeCard({ icon: Icon, title, meta, tone, badge, score, progress, x, y, width, height, selected, onSelect }: NodeCardProps) {
  const theme = useTheme();
  const palette = tonePalette(theme, tone);
  return (
    <Card
      type="button"
      palette={palette}
      tone={tone}
      isSelected={selected}
      onClick={onSelect}
      aria-pressed={selected}
      title={title}
      style={{ width, height }}
      initial={{ opacity: 0, x, y: y + 8, scale: 0.97 }}
      animate={{ opacity: tone === 'muted' ? 0.5 : 1, x, y, scale: 1 }}
      transition={theme.motion.spring}
    >
      {tone === 'live' && <LiveSheen />}
      <IconTile palette={palette} tone={tone}>
        <Icon size={ICON_SIZE} strokeWidth={1.75} />
      </IconTile>
      <Text>
        <Title>{title}</Title>
        <Meta>{meta}</Meta>
      </Text>
      <Badges>
        {score !== undefined && <StatusBadge label={score} tone="scored" />}
        <StatusBadge label={badge} tone={tone} />
      </Badges>
      {progress !== undefined && progress.total > 0 && <CardProgress done={progress.done} total={progress.total} tone={tone} />}
    </Card>
  );
}
