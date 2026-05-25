// src/app/members/settings/__tests__/page.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { stashPortalSnapshot } from "@/lib/membership/portal-snapshot";
import SettingsPage from "../page";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));

const useMembershipMock = vi.fn();
vi.mock("@/hooks/useMembership", () => ({ useMembership: () => useMembershipMock() }));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "ada@example.com", user_metadata: { name: "Ada", phone: "" } },
    loading: false,
    supabase: { auth: { updateUser: vi.fn() } },
  }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

vi.mock("react-hook-form", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-hook-form")>();
  return {
    ...actual,
    useForm: () => ({
      register: vi.fn(() => ({})),
      handleSubmit: vi.fn((fn: unknown) => (e: unknown) => {
        if (e && typeof (e as { preventDefault: unknown }).preventDefault === "function") {
          (e as { preventDefault: () => void }).preventDefault();
        }
        return fn;
      }),
      formState: { errors: {}, isSubmitting: false },
      reset: vi.fn(),
    }),
  };
});

vi.mock("@hookform/resolvers/zod", () => ({ zodResolver: vi.fn(() => vi.fn()) }));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><SettingsPage /></QueryClientProvider>);
}

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.clearAllMocks());

describe("Settings page portal-return toast", () => {
  it("toasts 'Plan changed to pro' when the snapshot diff is plan_changed", async () => {
    stashPortalSnapshot({ status: "active", tierSlug: "lite", cancelAtPeriodEnd: false });
    useMembershipMock.mockReturnValue({
      membership: {
        status: "active", tier: { slug: "pro", name: "Pro" },
        billingPeriodEnd: "2026-06-25T00:00:00Z", cancelAtPeriodEnd: false,
      },
    });
    renderPage();
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith("Plan changed to pro"));
  });

  it("toasts 'Cancellation scheduled for ...' when snapshot diff is cancel_scheduled", async () => {
    stashPortalSnapshot({ status: "active", tierSlug: "lite", cancelAtPeriodEnd: false });
    useMembershipMock.mockReturnValue({
      membership: {
        status: "active", tier: { slug: "lite", name: "Lite" },
        billingPeriodEnd: "2026-06-25T00:00:00Z", cancelAtPeriodEnd: true,
      },
    });
    renderPage();
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/Cancellation scheduled for /)));
  });

  it("does nothing when no snapshot is stashed", async () => {
    useMembershipMock.mockReturnValue({
      membership: { status: "active", tier: { slug: "lite", name: "Lite" }, billingPeriodEnd: "2026-06-25T00:00:00Z", cancelAtPeriodEnd: false },
    });
    renderPage();
    await new Promise((r) => setTimeout(r, 50));
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });
});
