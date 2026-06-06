import type { Metadata } from "next";
import { ResetPasswordPage } from "./ResetPasswordPage";

export const metadata: Metadata = {
  title: "Set a new password",
};

export default function Page() {
  return <ResetPasswordPage />;
}
