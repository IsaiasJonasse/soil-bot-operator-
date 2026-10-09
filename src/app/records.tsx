import { AppShell } from '@/components/app-shell';
import { RecordsScreen } from '@/features/records/records-screen';

export default function RecordsRoute() {
  return <AppShell title="Field records" subtitle="Offline-first session archive"><RecordsScreen /></AppShell>;
}
