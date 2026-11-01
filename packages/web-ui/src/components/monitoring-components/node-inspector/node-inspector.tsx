import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, X } from 'lucide-react';
import { glassSurface } from '../../../theme/glass-surface';
import { StatusBadge } from '../status-badge/status-badge';
import type { StatusTone } from '../types/status-tone';

/** One block of text in the inspector, such as "Objective" or "What was good". */
interface InspectorSection {
  readonly heading: string;
  readonly body: string;
}

/** What the inspector shows for the selected card. Null closes it. */
export interface NodeInspectorProps {
  readonly node: {
    readonly id: string;
    readonly kind: string;
    readonly title: string;
    readonly badge: string;
    readonly tone: StatusTone;
    readonly score?: string;
    readonly sections: readonly InspectorSection[];
    readonly link?: string;
  } | null;
  readonly onClose: () => void;
}

const Panel = styled(motion.aside)`
  position: absolute;
  top: ${({ theme }) => theme.space(3)};
  right: ${({ theme }) => theme.space(3)};
  bottom: ${({ theme }) => theme.space(3)};
  z-index: 4;
  display: flex;
  flex-direction: column;
  width: 380px;
  max-width: calc(100% - 24px);
  border-radius: ${({ theme }) => theme.radius.lg};
  ${({ theme }) => glassSurface(theme, 'deep')};
`;

const Head = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2.5)};
  padding: ${({ theme }) => theme.space(5)};
  border-bottom: 1px solid ${({ theme }) => theme.glass.edge};
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(2)};
`;

const Kind = styled.span`
  color: ${({ theme }) => theme.color.textMuted};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const Close = styled.button`
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  background: transparent;
  color: ${({ theme }) => theme.color.textMuted};
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.color.hover};
    color: ${({ theme }) => theme.color.text};
  }
`;

const Title = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  line-height: 1.35;
  letter-spacing: -0.015em;
`;

const Badges = styled.div`
  display: flex;
  gap: 6px;
`;

const Body = styled.div`
  position: relative;
  flex: 1;
  overflow: auto;
  padding: ${({ theme }) => `${theme.space(2)} ${theme.space(5)} ${theme.space(5)}`};
`;

const Section = styled.section`
  padding: ${({ theme }) => `${theme.space(3.5)} 0`};
  & + & {
    border-top: 1px solid ${({ theme }) => theme.glass.edge};
  }
`;

const Heading = styled.h3`
  margin: 0 0 ${({ theme }) => theme.space(1.5)};
  color: ${({ theme }) => theme.color.textMuted};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10px;
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const Text = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.color.text};
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const Link = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.color.accentText};
  font-size: ${({ theme }) => theme.font.size.sm};
  text-decoration: none;
  overflow-wrap: anywhere;
  &:hover {
    text-decoration: underline;
  }
`;

/** A glass side panel with the full details of the selected card. */
export function NodeInspector({ node, onClose }: NodeInspectorProps) {
  const theme = useTheme();
  return (
    <AnimatePresence>
      {node !== null && (
        <Panel
          key={node.id}
          aria-label={`${node.kind} details`}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={theme.motion.spring}
        >
          <Head>
            <Row>
              <Kind>{node.kind}</Kind>
              <Close type="button" aria-label="Close details" onClick={onClose}>
                <X size={16} />
              </Close>
            </Row>
            <Title>{node.title}</Title>
            <Badges>
              <StatusBadge label={node.badge} tone={node.tone} />
              {node.score !== undefined && <StatusBadge label={node.score} tone="scored" />}
            </Badges>
          </Head>
          <Body>
            {node.sections.map((section) => (
              <Section key={section.heading}>
                <Heading>{section.heading}</Heading>
                <Text>{section.body}</Text>
              </Section>
            ))}
            {node.link !== undefined && (
              <Section>
                <Heading>Where</Heading>
                {/^https?:\/\//.test(node.link) ? (
                  <Link href={node.link} target="_blank" rel="noreferrer">
                    {node.link}
                    <ExternalLink size={12} />
                  </Link>
                ) : (
                  <Text>{node.link}</Text>
                )}
              </Section>
            )}
          </Body>
        </Panel>
      )}
    </AnimatePresence>
  );
}
