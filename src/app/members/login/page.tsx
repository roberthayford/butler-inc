import type { Metadata } from "next";
import { LoginPage } from "./LoginPage";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function Page() {
  return <LoginPage />;
}
