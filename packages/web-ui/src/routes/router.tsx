import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from '../layout/app-shell';
import { CreateStrategyPage } from '../pages/create-strategy/create-strategy-page';
import { MonitorPage } from '../pages/monitor/monitor-page';
import { SettingsPage } from '../pages/settings/settings-page';
import { ROUTE_PATHS } from './route-paths';

/** The app's routes: every page renders inside the shell, and the root opens Monitor. */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to={ROUTE_PATHS.monitor} replace /> },
      { path: ROUTE_PATHS.monitor, element: <MonitorPage /> },
      { path: ROUTE_PATHS.createStrategy, element: <CreateStrategyPage /> },
      { path: ROUTE_PATHS.settings, element: <SettingsPage /> },
      { path: '*', element: <Navigate to={ROUTE_PATHS.monitor} replace /> },
    ],
  },
]);
