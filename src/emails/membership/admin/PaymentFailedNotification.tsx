import { Text } from "@react-email/components";
import { AdminEmailLayout } from "./AdminEmailLayout";
import { DetailRow } from "@/emails/components/DetailRow";

export interface PaymentFailedNotificationProps { name: string; email: string; tierName: string; }

export function PaymentFailedNotification({ name, email, tierName }: PaymentFailedNotificationProps) {
  return (
    <AdminEmailLayout
      preview={`Payment failed: ${name} (${tierName})`}
      heading={`Payment failed: ${name} (${tierName})`}
    >
      <DetailRow label="Name" value={name} />
      <DetailRow label="Email" value={email} />
      <DetailRow label="Tier" value={tierName} />
      <Text style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "13px", color: "#4A5568", margin: "12px 0 0" }}>
        Stripe will retry automatically. Member benefits are suspended until payment recovers.
      </Text>
    </AdminEmailLayout>
  );
}

PaymentFailedNotification.PreviewProps = { name: "Ada", email: "ada@example.com", tierName: "Pro" } satisfies PaymentFailedNotificationProps;
export default PaymentFailedNotification;
