import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";
import { GenieSection } from "../GenieSection";

function stripMotionProps(props: Record<string, unknown>) {
  const cleaned: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(props)) {
    if (
      key === "initial" ||
      key === "animate" ||
      key === "exit" ||
      key === "transition" ||
      key === "whileInView" ||
      key === "whileHover" ||
      key === "whileTap" ||
      key === "viewport"
    )
      continue;
    cleaned[key] = val;
  }
  return cleaned;
}

function makeMotionComponent(Tag: string) {
  const Component = ({ children, ...props }: Record<string, unknown>) => {
    const El = Tag as React.ElementType;
    return <El {...stripMotionProps(props)}>{children as React.ReactNode}</El>;
  };
  Component.displayName = `motion.${Tag}`;
  return Component;
}

vi.mock("motion/react", () => ({
  motion: {
    section: makeMotionComponent("section"),
    div: makeMotionComponent("div"),
    h2: makeMotionComponent("h2"),
    p: makeMotionComponent("p"),
    span: makeMotionComponent("span"),
    button: makeMotionComponent("button"),
    ul: makeMotionComponent("ul"),
    li: makeMotionComponent("li"),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("GenieSection", () => {
  describe("wish phase", () => {
    it("renders the section heading", () => {
      render(<GenieSection />);
      expect(
        screen.getByText("Have an impossible wish?")
      ).toBeInTheDocument();
    });

    it("renders the section label", () => {
      render(<GenieSection />);
      expect(screen.getByText(/Genie In a Butler/i)).toBeInTheDocument();
    });

    it("renders a textarea for wish input", () => {
      render(<GenieSection />);
      expect(
        screen.getByRole("textbox", { name: /your wish/i })
      ).toBeInTheDocument();
    });

    it("renders the CTA button", () => {
      render(<GenieSection />);
      expect(
        screen.getByRole("button", { name: /summon your genie/i })
      ).toBeInTheDocument();
    });

    it("CTA button is disabled when textarea is empty", () => {
      render(<GenieSection />);
      const button = screen.getByRole("button", {
        name: /summon your genie/i,
      });
      expect(button).toBeDisabled();
    });

    it("CTA button is enabled when textarea has text", () => {
      render(<GenieSection />);
      const textarea = screen.getByRole("textbox", { name: /your wish/i });
      fireEvent.change(textarea, {
        target: { value: "Find me a sold-out handbag" },
      });
      const button = screen.getByRole("button", {
        name: /summon your genie/i,
      });
      expect(button).not.toBeDisabled();
    });

    it("displays example wishes", () => {
      render(<GenieSection />);
      expect(
        screen.getByText(/emergency childcare for tonight/i)
      ).toBeInTheDocument();
    });
  });

  describe("contact phase", () => {
    function goToContactPhase() {
      render(<GenieSection />);
      const textarea = screen.getByRole("textbox", { name: /your wish/i });
      fireEvent.change(textarea, {
        target: { value: "I need a rare 1982 Chateau Margaux by 8pm" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /summon your genie/i })
      );
    }

    it("shows contact form fields after CTA click", () => {
      goToContactPhase();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    });

    it("shows the wish text in read-only display", () => {
      goToContactPhase();
      expect(
        screen.getByText("I need a rare 1982 Chateau Margaux by 8pm")
      ).toBeInTheDocument();
    });

    it("renders a submit button", () => {
      goToContactPhase();
      expect(
        screen.getByRole("button", { name: /submit your wish/i })
      ).toBeInTheDocument();
    });

    it("submit button is disabled when required fields are empty", () => {
      goToContactPhase();
      const submitBtn = screen.getByRole("button", {
        name: /submit your wish/i,
      });
      expect(submitBtn).toBeDisabled();
    });

    it("submit button is enabled when all required fields are filled", () => {
      goToContactPhase();
      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: "Jane Smith" },
      });
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "jane@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/phone/i), {
        target: { value: "07700900000" },
      });
      const submitBtn = screen.getByRole("button", {
        name: /submit your wish/i,
      });
      expect(submitBtn).not.toBeDisabled();
    });
  });

  describe("submission and success", () => {
    function fillAndSubmit() {
      render(<GenieSection />);
      const textarea = screen.getByRole("textbox", { name: /your wish/i });
      fireEvent.change(textarea, {
        target: { value: "Find a private island for the weekend" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /summon your genie/i })
      );
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

    it("shows success message after successful submission", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ reference: "BT-TEST1", success: true }),
      });

      fillAndSubmit();

      await waitFor(() => {
        expect(screen.getByText(/we'll be in touch/i)).toBeInTheDocument();
      });
    });

    it("calls the bookings API with correct genie payload", async () => {
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

    it("shows error state when API call fails", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Server error" }),
      });

      fillAndSubmit();

      await waitFor(() => {
        expect(
          screen.getByText(/something went wrong/i)
        ).toBeInTheDocument();
      });
    });
  });
});
