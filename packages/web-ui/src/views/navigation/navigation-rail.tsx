import { LayoutGroup } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router';
import { LogoMark } from '../../components/logo-mark/logo-mark';
import { Rail } from '../../components/rail/rail';
import { RailItem } from '../../components/rail/rail-item';
import { NAVIGATION_ITEMS } from './navigation-items';

/** The rail wired to the router: it marks the current page and navigates on select. */
export function NavigationRail() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const toItem = (item: (typeof NAVIGATION_ITEMS.main)[number]) => (
    <RailItem
      key={item.path}
      icon={item.icon}
      label={item.label}
      active={pathname.startsWith(item.path)}
      onSelect={() => navigate(item.path)}
    />
  );
  return (
    <LayoutGroup>
      <Rail
        label="Main"
        brand={<LogoMark />}
        items={NAVIGATION_ITEMS.main.map(toItem)}
        footer={NAVIGATION_ITEMS.footer.map(toItem)}
      />
    </LayoutGroup>
  );
}
