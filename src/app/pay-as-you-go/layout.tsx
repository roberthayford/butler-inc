import { MarketingShell } from "@/components/layout/MarketingShell";

export default function PayAsYouGoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MarketingShell>{children}</MarketingShell>;
}
