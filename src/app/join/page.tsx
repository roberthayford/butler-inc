import type { Metadata } from "next";
import { JoinPage } from "./JoinPage";

export const metadata: Metadata = {
  title: "Members | Butlers Inc.",
  description:
    "Sign in to your Butlers Inc. account, or become a member to save on every booking.",
};

export default function Page() {
  return <JoinPage />;
}
