import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import MembersLayout from "../layout";

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: null, loading: false, signOut: vi.fn() }),
}));

vi.mock("@/lib/admin", () => ({ isAdmin: () => false }));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("members/layout", () => {
  it("renders Header, children, and Footer", () => {
    render(
      <MembersLayout>
        <p data-testid="child">members child</p>
      </MembersLayout>,
    );
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
