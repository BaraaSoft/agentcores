import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

/** A section that opens on click. The summary shows the current values while it is closed. An optional `badge` sits beside the title. */
export interface DisclosureProps {
  readonly title: string;
  readonly summary: string;
  readonly badge?: string;
  readonly children: ReactNode;
}

const Frame = styled.div`
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.015);
`;

const Toggle = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  width: 100%;
  padding: ${({ theme }) => `${theme.space(3.5)} ${theme.space(4)}`};
  border: none;
  border-radius: inherit;
  background: transparent;
  color: ${({ theme }) => theme.color.text};
  font: inherit;
  text-align: left;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.color.hover};
  }
  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 1px ${({ theme }) => theme.color.accent};
  }
`;

const Chevron = styled(motion.span)`
  display: grid;
  place-items: center;
  color: ${({ theme }) => theme.color.textMuted};
`;

const Title = styled.span`
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
`;

const Summary = styled.span`
  margin-left: auto;
  color: ${({ theme }) => theme.color.textFaint};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.font.size.xs};
`;

const Badge = styled.span`
  padding: ${({ theme }) => `${theme.space(0.5)} ${theme.space(2)}`};
  border-radius: 999px;
  background: ${({ theme }) => theme.color.accentSoft};
  box-shadow: inset 0 0 0 1px rgba(0, 129, 251, 0.32);
  color: ${({ theme }) => theme.color.accentText};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10px;
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Body = styled(motion.div)`
  overflow: hidden;
`;

const Inner = styled.div`
  padding: ${({ theme }) => `${theme.space(1)} ${theme.space(4)} ${theme.space(5)}`};
`;

/** A collapsed panel with a rotating chevron; its body slides open and closed. */
export function Disclosure({ title, summary, badge, children }: DisclosureProps) {
  const theme = useTheme();
  const bodyId = useId();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Frame>
      <Toggle type="button" aria-expanded={isOpen} aria-controls={bodyId} onClick={() => setIsOpen((open) => !open)}>
        <Chevron animate={{ rotate: isOpen ? 90 : 0 }} transition={theme.motion.spring} aria-hidden>
          <ChevronRight size={16} strokeWidth={2} />
        </Chevron>
        <Title>{title}</Title>
        {badge !== undefined && <Badge>{badge}</Badge>}
        <Summary>{summary}</Summary>
      </Toggle>
      <AnimatePresence initial={false}>
        {isOpen && (
          <Body id={bodyId} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={theme.motion.spring}>
            <Inner>{children}</Inner>
          </Body>
        )}
      </AnimatePresence>
    </Frame>
  );
}
