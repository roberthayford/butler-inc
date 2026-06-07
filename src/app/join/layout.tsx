import { MarketingShell } from "@/components/layout/MarketingShell";

export default function JoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MarketingShell>{children}</MarketingShell>;
}
