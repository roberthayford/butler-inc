import { Text } from "@react-email/components";
import { AdminEmailLayout } from "./AdminEmailLayout";
import { DetailRow } from "@/emails/components/DetailRow";

export interface NewMemberNotificationProps {
  name: string;
  email: string;
  tierName: string;
  monthlyPrice: number;
  subscriptionId: string;
}

export function NewMemberNotification({ name, email, tierName, monthlyPrice, subscriptionId }: NewMemberNotificationProps) {
  return (
    <AdminEmailLayout
      preview={`New ${tierName} member: ${name}`}
      heading={`New ${tierName} member: ${name}`}
    >
      <DetailRow label="Name" value={name} />
      <DetailRow label="Email" value={email} />
      <DetailRow label="Tier" value={tierName} />
      <DetailRow label="Monthly" value={`£${monthlyPrice}`} />
      <DetailRow label="Subscription" value={subscriptionId} />
      <Text style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "12px", color: "#9E9893", margin: "16px 0 0" }}>
        Sent automatically by Butlers Inc lifecycle notifier.
      </Text>
    </AdminEmailLayout>
  );
}

NewMemberNotification.PreviewProps = {
  name: "Ada Lovelace", email: "ada@example.com", tierName: "Lite", monthlyPrice: 500, subscriptionId: "sub_abc123",
} satisfies NewMemberNotificationProps;

export default NewMemberNotification;
