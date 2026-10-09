import { AppShell } from '@/components/app-shell';
import { LiveMapScreen } from '@/features/live-map/live-map-screen';
import { useOperator } from '@/state/operator-context';

export default function DashboardRoute() {
  const { session } = useOperator();
  return <AppShell title="Live operation" subtitle={session.fieldName}><LiveMapScreen /></AppShell>;
}
