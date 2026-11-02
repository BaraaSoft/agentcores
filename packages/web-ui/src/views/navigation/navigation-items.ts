import { Activity, LayoutGrid, Settings, type LucideIcon } from 'lucide-react';
import { NewStrategyIcon } from '../../components/icons/new-strategy-icon';
import { ROUTE_PATHS } from '../../routes/route-paths';

/** One page that the rail links to. */
interface NavigationItem {
  readonly path: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

/** The rail's pages: the main ones in the middle, and Settings pinned to the bottom. */
export const NAVIGATION_ITEMS: {
  readonly main: readonly NavigationItem[];
  readonly footer: readonly NavigationItem[];
} = {
  main: [
    { path: ROUTE_PATHS.monitor, label: 'Monitor work', icon: Activity },
    { path: ROUTE_PATHS.workHub, label: 'WorkHub', icon: LayoutGrid },
    { path: ROUTE_PATHS.createStrategy, label: 'Create strategy', icon: NewStrategyIcon },
  ],
  footer: [{ path: ROUTE_PATHS.settings, label: 'Settings', icon: Settings }],
};
