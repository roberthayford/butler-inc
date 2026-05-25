import { AdminEmailLayout } from "./AdminEmailLayout";
import { DetailRow } from "@/emails/components/DetailRow";

export interface CancellationFinalNotificationProps { name: string; email: string; tierName: string; endedAt: string; }

export function CancellationFinalNotification({ name, email, tierName, endedAt }: CancellationFinalNotificationProps) {
  return (
    <AdminEmailLayout
      preview={`Membership ended: ${name} (${tierName})`}
      heading={`Membership ended: ${name} (${tierName})`}
    >
      <DetailRow label="Name" value={name} />
      <DetailRow label="Email" value={email} />
      <DetailRow label="Tier" value={tierName} />
      <DetailRow label="Ended" value={endedAt} />
    </AdminEmailLayout>
  );
}

CancellationFinalNotification.PreviewProps = {
  name: "Ada", email: "ada@example.com", tierName: "Lite", endedAt: "25 Jun 2026",
} satisfies CancellationFinalNotificationProps;
export default CancellationFinalNotification;
