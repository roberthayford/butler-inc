import type { Metadata } from "next";
import { ForgotPasswordPage } from "./ForgotPasswordPage";

export const metadata: Metadata = {
  title: "Reset your password",
};

export default function Page() {
  return <ForgotPasswordPage />;
}
