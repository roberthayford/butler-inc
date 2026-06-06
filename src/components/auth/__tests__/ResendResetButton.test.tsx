import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ResendResetButton } from "../ResendResetButton";

describe("ResendResetButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when email is null", () => {
    const { container } = render(<ResendResetButton email={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("POSTs to the reset API and enters cooldown after a successful click", async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }) as Response);
    render(<ResendResetButton email="jane@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: /resend reset email/i }));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/members/password-reset",
      expect.objectContaining({ method: "POST" }),
    );
    await waitFor(() => expect(screen.getByRole("button")).toBeDisabled());
    expect(screen.getByRole("button").textContent).toMatch(/resend in \d+s/i);
  });
});
