import styled from '@emotion/styled';
import { Outlet } from 'react-router';
import { NavigationRail } from '../views/navigation/navigation-rail';

const Shell = styled.div`
  display: flex;
  height: 100%;
  background:
    radial-gradient(240px 320px at 0 0, ${({ theme }) => theme.color.accentSoft}, transparent 70%),
    radial-gradient(260px 360px at 0 100%, rgba(255, 255, 255, 0.045), transparent 70%),
    ${({ theme }) => theme.color.canvas};
`;

const Panel = styled.main`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  margin: ${({ theme }) => `${theme.layout.pageInset} ${theme.layout.pageInset} ${theme.layout.pageInset} 0`};
  overflow: auto;
  border-radius: ${({ theme }) => theme.radius.lg};
  background:
    radial-gradient(900px 260px at 18% -60px, ${({ theme }) => theme.color.accentSoft}, transparent 70%),
    radial-gradient(700px 220px at 85% -80px, rgba(255, 255, 255, 0.05), transparent 70%),
    ${({ theme }) => theme.color.surface};
  background-attachment: local;
  box-shadow:
    inset 0 0 0 1px ${({ theme }) => theme.color.border},
    0 1px 2px rgba(0, 0, 0, 0.4);
`;

/** The frame of the app: the glass rail on the black canvas, and the current page in a raised panel. */
export function AppShell() {
  return (
    <Shell>
      <NavigationRail />
      <Panel>
        <Outlet />
      </Panel>
    </Shell>
  );
}
