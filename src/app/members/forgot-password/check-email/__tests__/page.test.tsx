import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/test-utils";
import Page from "../page";

describe("forgot-password check-email page", () => {
  it("renders the email and the resend control", async () => {
    const ui = await Page({ searchParams: Promise.resolve({ email: "jane@example.com" }) });
    render(ui);
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resend reset email/i })).toBeInTheDocument();
  });

  it("renders a generic message when no email is provided", async () => {
    const ui = await Page({ searchParams: Promise.resolve({}) });
    render(ui);
    expect(screen.getByRole("heading", { name: /check your email/i })).toBeInTheDocument();
  });
});
