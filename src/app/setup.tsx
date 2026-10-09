import { AppShell } from '@/components/app-shell';
import { SetupScreen } from '@/features/setup/setup-screen';

export default function SetupRoute() {
  return <AppShell title="Field setup" subtitle="Configure the next mapping run"><SetupScreen /></AppShell>;
}
