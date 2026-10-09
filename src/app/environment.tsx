import { AppShell } from '@/components/app-shell';
import { EnvironmentScreen } from '@/features/environment/environment-screen';

export default function EnvironmentRoute() {
  return <AppShell title="Environment" subtitle="Live microclimate by position"><EnvironmentScreen /></AppShell>;
}
