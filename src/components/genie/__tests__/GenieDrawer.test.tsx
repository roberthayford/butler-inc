import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";
import { mockMotion } from "@/test/motion-mock";

mockMotion();

import { GenieDrawer } from "../GenieDrawer";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("GenieDrawer", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <GenieDrawer open={false} onClose={vi.fn()} />
    );
    expect(container.querySelector("[role='dialog']")).not.toBeInTheDocument();
  });

  it("renders the dialog when open", () => {
    render(<GenieDrawer open={true} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<GenieDrawer open={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(<GenieDrawer open={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<GenieDrawer open={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("genie-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe("wish phase", () => {
    it("renders the textarea", () => {
      render(<GenieDrawer open={true} onClose={vi.fn()} />);
      expect(
        screen.getByRole("textbox", { name: /your wish/i })
      ).toBeInTheDocument();
    });

    it("renders example wishes", () => {
      render(<GenieDrawer open={true} onClose={vi.fn()} />);
      expect(screen.getByText(/sold-out designer/i)).toBeInTheDocument();
    });

    it("continue button is disabled when textarea is empty", () => {
      render(<GenieDrawer open={true} onClose={vi.fn()} />);
      expect(
        screen.getByRole("button", { name: /continue/i })
      ).toBeDisabled();
    });

    it("continue button is enabled when textarea has text", () => {
      render(<GenieDrawer open={true} onClose={vi.fn()} />);
      fireEvent.change(screen.getByRole("textbox", { name: /your wish/i }), {
        target: { value: "Find me a rare wine" },
      });
      expect(
        screen.getByRole("button", { name: /continue/i })
      ).not.toBeDisabled();
    });
  });

  describe("contact phase", () => {
    function goToContact() {
      render(<GenieDrawer open={true} onClose={vi.fn()} />);
      fireEvent.change(screen.getByRole("textbox", { name: /your wish/i }), {
        target: { value: "I need a rare 1982 Chateau Margaux by 8pm" },
      });
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    }

    it("shows contact fields", () => {
      goToContact();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    });

    it("shows the wish text in a quote", () => {
      goToContact();
      expect(
        screen.getByText("I need a rare 1982 Chateau Margaux by 8pm")
      ).toBeInTheDocument();
    });

    it("submit button is disabled with empty fields", () => {
      goToContact();
      expect(
        screen.getByRole("button", { name: /submit your wish/i })
      ).toBeDisabled();
    });

    it("submit button is enabled when all fields are filled", () => {
      goToContact();
      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: "Jane Smith" },
      });
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "jane@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/phone/i), {
        target: { value: "07700900000" },
      });
      expect(
        screen.getByRole("button", { name: /submit your wish/i })
      ).not.toBeDisabled();
    });
  });

  describe("submission and success", () => {
    function fillAndSubmit() {
      render(<GenieDrawer open={true} onClose={vi.fn()} />);
      fireEvent.change(screen.getByRole("textbox", { name: /your wish/i }), {
        target: { value: "Find a private island" },
      });
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));
      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: "Jane Smith" },
      });
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "jane@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/phone/i), {
        target: { value: "07700900000" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /submit your wish/i })
      );
    }

    it("shows success message after submission", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ reference: "BT-TEST1", success: true }),
      });
      fillAndSubmit();
      await waitFor(() => {
        expect(screen.getByText(/wish received/i)).toBeInTheDocument();
      });
    });

    it("calls the bookings API with genie payload", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ reference: "BT-TEST2", success: true }),
      });
      fillAndSubmit();
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/bookings",
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining('"serviceOption":"genie"'),
          })
        );
      });
    });

    it("shows error when API fails", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Server error" }),
      });
      fillAndSubmit();
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
    });
  });
});
