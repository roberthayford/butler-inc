import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test/test-utils";

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ signIn: vi.fn() }),
}));

import { LoginPage } from "../LoginPage";

describe("LoginPage", () => {
  it("shows a Forgot password link pointing to /members/forgot-password", () => {
    render(<LoginPage />);
    const link = screen.getByRole("link", { name: /forgot password/i });
    expect(link).toHaveAttribute("href", "/members/forgot-password");
  });
});
