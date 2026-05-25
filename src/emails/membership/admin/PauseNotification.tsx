import { AdminEmailLayout } from "./AdminEmailLayout";
import { DetailRow } from "@/emails/components/DetailRow";

export interface PauseNotificationProps { name: string; email: string; tierName: string; pausedAt: string; }

export function PauseNotification({ name, email, tierName, pausedAt }: PauseNotificationProps) {
  return (
    <AdminEmailLayout
      preview={`Membership paused: ${name} (${tierName})`}
      heading={`Membership paused: ${name} (${tierName})`}
    >
      <DetailRow label="Name" value={name} />
      <DetailRow label="Email" value={email} />
      <DetailRow label="Tier" value={tierName} />
      <DetailRow label="Paused" value={pausedAt} />
    </AdminEmailLayout>
  );
}

PauseNotification.PreviewProps = { name: "Ada", email: "ada@example.com", tierName: "Lite", pausedAt: "25 May 2026" } satisfies PauseNotificationProps;
export default PauseNotification;
