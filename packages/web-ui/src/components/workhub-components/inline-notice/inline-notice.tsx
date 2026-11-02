import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

/** A short message in a tinted box: `success` is green, `warning` is amber, and `danger` is red. */
export interface InlineNoticeProps {
  readonly tone: 'success' | 'warning' | 'danger';
  readonly children: ReactNode;
  readonly action?: ReactNode;
}

const Box = styled(motion.div)<{ fg: string; bg: string }>`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: ${({ theme }) => theme.space(2.5)};
  padding: ${({ theme }) => `${theme.space(3)} ${theme.space(3.5)}`};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ bg }) => bg};
  box-shadow: inset 0 0 0 1px ${({ fg }) => fg}33;
  color: ${({ fg }) => fg};
  font-size: ${({ theme }) => theme.font.size.xs};
  line-height: 1.55;
  & > svg {
    margin-top: 1px;
  }
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space(2)};
`;

/** A notice with an icon that matches its tone, and an optional action under the text. */
export function InlineNotice({ tone, children, action }: InlineNoticeProps) {
  const theme = useTheme();
  const { fg, bg, Icon } = {
    success: { fg: theme.color.live, bg: theme.color.liveSoft, Icon: CircleCheck },
    warning: { fg: theme.color.warning, bg: theme.color.warningSoft, Icon: TriangleAlert },
    danger: { fg: theme.color.danger, bg: theme.color.dangerSoft, Icon: CircleAlert },
  }[tone];
  return (
    <Box
      fg={fg}
      bg={bg}
      role={tone === 'success' ? 'status' : 'alert'}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={theme.motion.fast}
    >
      <Icon size={15} strokeWidth={2.25} aria-hidden />
      <Body>
        <span>{children}</span>
        {action}
      </Body>
    </Box>
  );
}
