import { Settings } from 'lucide-react';
import { EmptyState } from '../../components/empty-state/empty-state';
import { PageHeader } from '../../components/page-header/page-header';

/** The settings page. Empty for now. */
export function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <EmptyState icon={Settings} title="No settings yet" description="Settings for the agent will live here." />
    </>
  );
}
