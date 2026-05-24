import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupPage } from "./SignupPage";

export const metadata: Metadata = {
  title: "Create Account",
};

// SignupPage uses useSearchParams() (to honour ?next= on post-signup redirect).
// Next.js App Router static prerendering requires useSearchParams to live inside
// a Suspense boundary, otherwise the build fails with
// "useSearchParams() should be wrapped in a suspense boundary".
export default function Page() {
  return (
    <Suspense>
      <SignupPage />
    </Suspense>
  );
}
