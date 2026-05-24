import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import { Header } from "../Header";

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: null, loading: false, signOut: vi.fn() }),
}));

describe("Header", () => {
  it("Join CTA links to /membership (not /members/signup)", () => {
    render(<Header />);
    const joinLinks = screen.getAllByRole("link", { name: /^join$/i });
    expect(joinLinks.length).toBeGreaterThan(0);
    joinLinks.forEach(link => {
      expect(link).toHaveAttribute("href", "/membership");
    });
  });
});
