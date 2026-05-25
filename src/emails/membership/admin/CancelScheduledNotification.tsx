import { AdminEmailLayout } from "./AdminEmailLayout";
import { DetailRow } from "@/emails/components/DetailRow";

export interface CancelScheduledNotificationProps { name: string; email: string; tierName: string; endsAt: string; }

export function CancelScheduledNotification({ name, email, tierName, endsAt }: CancelScheduledNotificationProps) {
  return (
    <AdminEmailLayout
      preview={`Cancellation scheduled: ${name} (${tierName})`}
      heading={`Cancellation scheduled: ${name} (${tierName})`}
    >
      <DetailRow label="Name" value={name} />
      <DetailRow label="Email" value={email} />
      <DetailRow label="Tier" value={tierName} />
      <DetailRow label="Ends" value={endsAt} />
    </AdminEmailLayout>
  );
}

CancelScheduledNotification.PreviewProps = {
  name: "Ada", email: "ada@example.com", tierName: "Pro", endsAt: "25 Jun 2026",
} satisfies CancelScheduledNotificationProps;
export default CancelScheduledNotification;
