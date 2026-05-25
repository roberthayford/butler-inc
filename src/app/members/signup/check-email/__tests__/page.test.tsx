import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import Page from "../page";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { resend: vi.fn() } }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

async function renderPage(searchParams: Record<string, string | string[] | undefined> = {}) {
  const ui = await Page({ searchParams: Promise.resolve(searchParams) });
  return render(ui);
}

describe("check-email page", () => {
  it("renders the H1 'Check your email'", async () => {
    await renderPage({ email: "ada@example.com" });
    expect(
      screen.getByRole("heading", { level: 1, name: /check your email/i }),
    ).toBeInTheDocument();
  });

  it("renders the supplied email in the body", async () => {
    await renderPage({ email: "ada@example.com" });
    expect(screen.getByText(/ada@example\.com/i)).toBeInTheDocument();
  });

  it("renders the generic body when email is missing and hides the resend button", async () => {
    await renderPage({});
    expect(
      screen.getByText(/email you signed up with/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /resend verification email/i }),
    ).toBeNull();
  });

  it("renders the resend button when email is provided", async () => {
    await renderPage({ email: "ada@example.com" });
    expect(
      screen.getByRole("button", { name: /resend verification email/i }),
    ).toBeInTheDocument();
  });

  it("renders the junk-folder callout", async () => {
    await renderPage({ email: "ada@example.com" });
    expect(
      screen.getByText(/junk or spam folder/i),
    ).toBeInTheDocument();
  });

  it("renders 'Wrong email? Start over' link to /members/signup", async () => {
    await renderPage({ email: "ada@example.com" });
    const link = screen.getByRole("link", { name: /wrong email\? start over/i });
    expect(link).toHaveAttribute("href", "/members/signup");
  });

  it("renders 'Already verified? Sign in' link to /members/login", async () => {
    await renderPage({ email: "ada@example.com" });
    const link = screen.getByRole("link", { name: /already verified\? sign in/i });
    expect(link).toHaveAttribute("href", "/members/login");
  });

  it("when email is an array, uses the first element", async () => {
    await renderPage({ email: ["first@example.com", "second@example.com"] });
    expect(screen.getByText(/first@example\.com/i)).toBeInTheDocument();
  });

  it("when email is empty string, falls back to generic body", async () => {
    await renderPage({ email: "" });
    expect(
      screen.getByText(/email you signed up with/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /resend verification email/i }),
    ).toBeNull();
  });
});
