import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import { AudienceCTA } from "../AudienceCTA";
import * as AuthContext from "@/context/AuthContext";

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock("@/context/AuthContext");

describe("AudienceCTA", () => {
  it("renders nothing while auth is loading", () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      user: null,
      loading: true,
      session: null,
      supabase: {} as never,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
    const { container } = render(<AudienceCTA />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders two cards when unauthenticated", () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      user: null,
      loading: false,
      session: null,
      supabase: {} as never,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
    render(<AudienceCTA />);
    expect(screen.getByText("New to Butlers Inc.?")).toBeInTheDocument();
    expect(screen.getByText("Already a member?")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Browse Our Butlers/i })
    ).toHaveAttribute("href", "/butlers");
    expect(screen.getByRole("link", { name: /Sign In/i })).toHaveAttribute(
      "href",
      "/members/login"
    );
  });

  it("renders personalised welcome card when authenticated", () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      user: {
        id: "user-1",
        email: "jane@example.com",
        user_metadata: { name: "Jane Smith" },
      } as never,
      loading: false,
      session: null,
      supabase: {} as never,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
    render(<AudienceCTA />);
    expect(screen.getByText(/Welcome back, Jane/i)).toBeInTheDocument();
    expect(
      screen.queryByText("New to Butlers Inc.?")
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Go to Dashboard/i })
    ).toHaveAttribute("href", "/members/dashboard");
  });

  it("falls back to email prefix when user has no name", () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      user: {
        id: "user-2",
        email: "hello@example.com",
        user_metadata: {},
      } as never,
      loading: false,
      session: null,
      supabase: {} as never,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
    render(<AudienceCTA />);
    expect(screen.getByText(/Welcome back, hello/i)).toBeInTheDocument();
  });
});
