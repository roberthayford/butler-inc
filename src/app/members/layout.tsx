import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Members",
    template: "%s | Butlers Inc.",
  },
};

export default function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
