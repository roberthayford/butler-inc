# Persistent Genie CTA Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the in-page GenieSection with a persistent site-wide sticky CTA bar that opens a bottom-sheet drawer for the wish submission flow.

**Architecture:** Two new components — `GenieStickyBar` (persistent CTA in layout) and `GenieDrawer` (overlay form). The existing `GenieSection` is deleted. Form logic moves into the drawer. Both components live in `src/components/genie/`.

**Tech Stack:** React 19, Framer Motion (`motion/react`), Tailwind CSS v4, Vitest + Testing Library, Next.js App Router

---

## Shared Test Utilities

The motion mock from the old GenieSection tests will be needed by all new test files. Extract it once and reuse.

---

### Task 1: Create shared Framer Motion test mock

**Files:**
- Create: `src/test/motion-mock.tsx`

**Step 1: Create the mock file**

```tsx
import { vi } from "vitest";
import type { ReactNode } from "react";

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
    return <El {...stripMotionProps(props)}>{children as ReactNode}</El>;
  };
  Component.displayName = `motion.${Tag}`;
  return Component;
}

export function mockMotion() {
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
      nav: makeMotionComponent("nav"),
      aside: makeMotionComponent("aside"),
    },
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  }));
}
```

**Step 2: Verify the file was created**

Run: `ls src/test/motion-mock.tsx`

**Step 3: Commit**

```bash
git add src/test/motion-mock.tsx
git commit -m "refactor: extract shared Framer Motion test mock"
```

---

### Task 2: Build GenieStickyBar — failing tests

**Files:**
- Create: `src/components/genie/__tests__/GenieStickyBar.test.tsx`

**Step 1: Write the failing tests**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { mockMotion } from "@/test/motion-mock";

mockMotion();

// Mock GenieDrawer to isolate GenieStickyBar tests
vi.mock("../GenieDrawer", () => ({
  GenieDrawer: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="genie-drawer">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

import { GenieStickyBar } from "../GenieStickyBar";

beforeEach(() => {
  vi.restoreAllMocks();
  // Reset scroll position
  Object.defineProperty(window, "scrollY", { value: 0, writable: true });
});

describe("GenieStickyBar", () => {
  it("is hidden when scrollY is below threshold", () => {
    render(<GenieStickyBar />);
    const bar = screen.getByRole("complementary", { hidden: true });
    expect(bar).toHaveAttribute("aria-hidden", "true");
  });

  it("becomes visible after scrolling past 200px", () => {
    render(<GenieStickyBar />);
    Object.defineProperty(window, "scrollY", { value: 250 });
    fireEvent.scroll(window);
    const bar = screen.getByRole("complementary");
    expect(bar).toHaveAttribute("aria-hidden", "false");
  });

  it("renders the invitation text", () => {
    render(<GenieStickyBar />);
    expect(screen.getByText(/have an impossible wish/i)).toBeInTheDocument();
  });

  it("renders the CTA button", () => {
    render(<GenieStickyBar />);
    expect(
      screen.getByRole("button", { name: /summon your genie/i })
    ).toBeInTheDocument();
  });

  it("opens the drawer when CTA button is clicked", () => {
    Object.defineProperty(window, "scrollY", { value: 250 });
    render(<GenieStickyBar />);
    fireEvent.scroll(window);
    fireEvent.click(
      screen.getByRole("button", { name: /summon your genie/i })
    );
    expect(screen.getByTestId("genie-drawer")).toBeInTheDocument();
  });

  it("closes the drawer when onClose is called", () => {
    Object.defineProperty(window, "scrollY", { value: 250 });
    render(<GenieStickyBar />);
    fireEvent.scroll(window);
    fireEvent.click(
      screen.getByRole("button", { name: /summon your genie/i })
    );
    expect(screen.getByTestId("genie-drawer")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Close"));
    expect(screen.queryByTestId("genie-drawer")).not.toBeInTheDocument();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/genie/__tests__/GenieStickyBar.test.tsx`
Expected: FAIL — module not found

**Step 3: Commit**

```bash
git add src/components/genie/__tests__/GenieStickyBar.test.tsx
git commit -m "test: add failing tests for GenieStickyBar"
```

---

### Task 3: Build GenieStickyBar — implementation

**Files:**
- Create: `src/components/genie/GenieStickyBar.tsx`

**Step 1: Implement GenieStickyBar**

```tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GenieDrawer } from "./GenieDrawer";

const SCROLL_THRESHOLD = 200;
const PREMIUM_EASE = [0.22, 1, 0.36, 1] as const;

export function GenieStickyBar() {
  const [visible, setVisible] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > SCROLL_THRESHOLD);
    handleScroll(); // check initial position
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <AnimatePresence>
        {visible && !drawerOpen && (
          <motion.aside
            role="complementary"
            aria-hidden={!visible}
            aria-label="Genie wish CTA"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: PREMIUM_EASE }}
            className={`
              fixed bottom-0 left-0 right-0 z-50
              md:bottom-6 md:right-6 md:left-auto md:w-[380px]
            `}
          >
            {/* Mobile: slim full-width bar */}
            <div className="md:hidden bg-charcoal/95 backdrop-blur-md border-t border-primary-foreground/10 px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-warm-gray text-sm truncate">
                Have an impossible wish?
              </p>
              <button
                onClick={() => setDrawerOpen(true)}
                className="shrink-0 px-4 py-2 rounded-sm bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors"
              >
                Summon Your Genie
              </button>
            </div>

            {/* Desktop: floating card */}
            <div className="hidden md:block bg-charcoal/95 backdrop-blur-md border border-primary-foreground/10 rounded-sm p-5 shadow-lg shadow-black/20">
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-sm">
                <div className="absolute bottom-0 right-0 w-[200px] h-[200px] rounded-full bg-destructive/[0.04] blur-[80px]" />
              </div>
              <p className="text-optical-white font-serif text-lg relative">
                Have an impossible wish?
              </p>
              <p className="text-warm-gray text-sm mt-1.5 relative">
                Tell us what you want. We{"'"}ll make it happen.
              </p>
              <button
                onClick={() => setDrawerOpen(true)}
                className="relative mt-4 w-full py-2.5 rounded-sm bg-destructive text-white text-sm font-medium hover:bg-destructive/90 hover:shadow-[0_0_24px_rgba(223,49,49,0.25)] transition-all duration-300"
              >
                Summon Your Genie
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <GenieDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
```

**Step 2: Create a stub GenieDrawer so the import resolves**

Create `src/components/genie/GenieDrawer.tsx`:

```tsx
"use client";

interface GenieDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function GenieDrawer({ open, onClose }: GenieDrawerProps) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Summon Your Genie">
      <button onClick={onClose}>Close</button>
      <p>Drawer placeholder</p>
    </div>
  );
}
```

**Step 3: Run tests**

Run: `npx vitest run src/components/genie/__tests__/GenieStickyBar.test.tsx`
Expected: PASS (all 6 tests)

**Step 4: Commit**

```bash
git add src/components/genie/GenieStickyBar.tsx src/components/genie/GenieDrawer.tsx
git commit -m "feat: implement GenieStickyBar with mobile bar and desktop floating card"
```

---

### Task 4: Build GenieDrawer — failing tests

**Files:**
- Create: `src/components/genie/__tests__/GenieDrawer.test.tsx`

**Step 1: Write the failing tests**

Port the existing GenieSection test logic (wish → contact → success phases) to target GenieDrawer. The drawer receives `open` and `onClose` props instead of rendering itself.

```tsx
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
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/genie/__tests__/GenieDrawer.test.tsx`
Expected: FAIL — stub drawer doesn't have the form phases

**Step 3: Commit**

```bash
git add src/components/genie/__tests__/GenieDrawer.test.tsx
git commit -m "test: add failing tests for GenieDrawer form phases"
```

---

### Task 5: Build GenieDrawer — implementation

**Files:**
- Modify: `src/components/genie/GenieDrawer.tsx` (replace stub)

**Step 1: Implement the full GenieDrawer**

Replace the stub with the full implementation. Port the 3-phase form logic from the old `GenieSection.tsx`, adapted for the drawer/overlay pattern.

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";

const EXAMPLE_WISHES = [
  "Source a sold-out designer handbag before the weekend",
  "Arrange a private chef for 12 guests in under 3 hours",
  "Find and book a villa in Santorini departing this Friday",
] as const;

const PREMIUM_EASE = [0.22, 1, 0.36, 1] as const;

type Phase = "wish" | "contact" | "success";

interface ContactFields {
  name: string;
  email: string;
  phone: string;
}

interface GenieDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function GenieDrawer({ open, onClose }: GenieDrawerProps) {
  const [phase, setPhase] = useState<Phase>("wish");
  const [wish, setWish] = useState("");
  const [contact, setContact] = useState<ContactFields>({
    name: "",
    email: "",
    phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contactValid =
    contact.name.trim() !== "" &&
    contact.email.trim() !== "" &&
    contact.phone.trim() !== "";

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Escape key closes drawer
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    },
    [open, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Auto-close after success
  useEffect(() => {
    if (phase === "success") {
      const timer = setTimeout(() => {
        onClose();
        // Reset form after close animation
        setTimeout(() => {
          setPhase("wish");
          setWish("");
          setContact({ name: "", email: "", phone: "" });
          setError(null);
        }, 300);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [phase, onClose]);

  const handleContinue = () => {
    if (wish.trim()) setPhase("contact");
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          butlerType: "bespoke",
          serviceOption: "genie",
          customDescription: wish,
          dayOption: "sameDay",
          timeSlot: "morning",
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
        }),
      });
      if (!res.ok) throw new Error("Server error");
      setPhase("success");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <motion.div
        data-testid="genie-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Summon Your Genie"
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ duration: 0.35, ease: PREMIUM_EASE }}
        className={`
          absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto
          md:left-auto md:right-6 md:bottom-6 md:w-[480px] md:max-h-[70vh] md:rounded-sm
          bg-charcoal border-t border-primary-foreground/10 md:border md:shadow-xl md:shadow-black/30
        `}
      >
        {/* Close button */}
        <div className="sticky top-0 z-10 flex justify-between items-center px-5 pt-4 pb-2 bg-charcoal">
          <span className="text-xs uppercase tracking-[0.25em] text-destructive font-medium">
            Genie In a Butler
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-warm-gray/60 hover:text-optical-white transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-6">
          <AnimatePresence mode="wait">
            {phase === "wish" && (
              <motion.div
                key="wish"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: PREMIUM_EASE }}
              >
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-optical-white tracking-tight">
                  Have an impossible wish?
                </h2>
                <p className="text-warm-gray mt-2 text-sm leading-relaxed">
                  Tell us what you want. We{"'"}ll make it happen.
                </p>

                <div className="mt-5">
                  <label htmlFor="genie-wish" className="sr-only">
                    Your wish
                  </label>
                  <textarea
                    id="genie-wish"
                    value={wish}
                    onChange={(e) => setWish(e.target.value)}
                    placeholder="Describe your impossible wish..."
                    rows={3}
                    className="w-full p-3.5 rounded-sm bg-primary-foreground/[0.04] border border-primary-foreground/15 text-optical-white placeholder:text-warm-gray/50 resize-none focus:outline-none focus:border-destructive/40 focus:ring-1 focus:ring-destructive/20 transition-colors duration-300 text-sm"
                  />
                </div>

                <button
                  onClick={handleContinue}
                  disabled={!wish.trim()}
                  className="mt-3 w-full py-3 rounded-sm bg-destructive text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:bg-destructive/90 hover:shadow-[0_0_24px_rgba(223,49,49,0.25)]"
                >
                  Continue
                </button>

                <ul className="mt-6 space-y-2">
                  {EXAMPLE_WISHES.map((example, i) => (
                    <li
                      key={i}
                      className="text-xs text-warm-gray/60 leading-relaxed flex items-start gap-2"
                    >
                      <span className="text-destructive/40 mt-px shrink-0">
                        &bull;
                      </span>
                      <span>{example}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {phase === "contact" && (
              <motion.div
                key="contact"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: PREMIUM_EASE }}
              >
                <h2 className="text-2xl font-serif font-bold text-optical-white tracking-tight">
                  Almost there
                </h2>

                <div className="mt-4 p-3.5 rounded-sm bg-primary-foreground/[0.04] border border-primary-foreground/10 border-l-2 border-l-destructive/40">
                  <p className="text-optical-white text-sm italic leading-relaxed">
                    {wish}
                  </p>
                </div>

                <div className="mt-5 space-y-3.5">
                  {([
                    { id: "genie-name", label: "Full name", type: "text", field: "name" as const, placeholder: "Jane Smith" },
                    { id: "genie-email", label: "Email", type: "email", field: "email" as const, placeholder: "you@example.com" },
                    { id: "genie-phone", label: "Phone", type: "tel", field: "phone" as const, placeholder: "07700 900000" },
                  ]).map((input) => (
                    <div key={input.id}>
                      <label
                        htmlFor={input.id}
                        className="block text-sm text-optical-white/90 mb-1 font-medium"
                      >
                        {input.label}
                      </label>
                      <input
                        id={input.id}
                        type={input.type}
                        value={contact[input.field]}
                        onChange={(e) =>
                          setContact((c) => ({ ...c, [input.field]: e.target.value }))
                        }
                        placeholder={input.placeholder}
                        className="w-full p-2.5 rounded-sm bg-primary-foreground/[0.04] border border-primary-foreground/15 text-optical-white placeholder:text-warm-gray/50 focus:outline-none focus:border-destructive/40 focus:ring-1 focus:ring-destructive/20 transition-colors duration-300 text-sm"
                      />
                    </div>
                  ))}
                </div>

                {error && (
                  <p className="mt-3 text-destructive text-sm">{error}</p>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={!contactValid || isSubmitting}
                  className="mt-5 w-full py-3 rounded-sm bg-destructive text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:bg-destructive/90 hover:shadow-[0_0_24px_rgba(223,49,49,0.25)]"
                >
                  {isSubmitting ? "Sending..." : "Submit Your Wish"}
                </button>

                <button
                  onClick={() => setPhase("wish")}
                  className="mt-2 w-full py-2 text-warm-gray/60 text-sm hover:text-warm-gray transition-colors"
                >
                  Back
                </button>
              </motion.div>
            )}

            {phase === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: PREMIUM_EASE }}
                className="text-center py-6"
              >
                <span className="inline-block w-12 h-12 rounded-full bg-destructive/10 mb-5">
                  <svg
                    className="w-12 h-12 p-3 text-destructive"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                </span>
                <h2 className="text-2xl font-serif font-bold text-optical-white tracking-tight">
                  Wish received
                </h2>
                <p className="mt-3 text-warm-gray text-sm leading-relaxed max-w-sm mx-auto">
                  We{"'"}ll be in touch within the hour to discuss your request.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
```

**Step 2: Run tests**

Run: `npx vitest run src/components/genie/__tests__/GenieDrawer.test.tsx`
Expected: PASS (all tests)

**Step 3: Run sticky bar tests too**

Run: `npx vitest run src/components/genie/__tests__/GenieStickyBar.test.tsx`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/genie/GenieDrawer.tsx
git commit -m "feat: implement GenieDrawer with wish/contact/success phases"
```

---

### Task 6: Wire into layout and remove old GenieSection

**Files:**
- Modify: `src/app/layout.tsx` — add GenieStickyBar
- Modify: `src/app/page.tsx` — remove GenieSection import and usage
- Delete: `src/components/landing/GenieSection.tsx`
- Delete: `src/components/landing/__tests__/GenieSection.test.tsx`

**Step 1: Write a smoke test for the homepage without GenieSection**

No new test file needed — just verify the existing `HomePage.test.tsx` still passes after removing GenieSection. Read it first to check if it references GenieSection.

Run: `npx vitest run src/app/__tests__/HomePage.test.tsx`
Note the current state before making changes.

**Step 2: Remove GenieSection from homepage**

In `src/app/page.tsx`, remove the `GenieSection` import and its `<GenieSection />` usage. The file should become:

```tsx
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ButlerCategoryGrid } from "@/components/landing/ButlerCategoryGrid";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main id="main-content">
        <Hero />
        <HowItWorks />
        <ButlerCategoryGrid />
      </main>
      <Footer />
    </>
  );
}
```

**Step 3: Add GenieStickyBar to layout**

In `src/app/layout.tsx`, import and render `GenieStickyBar` inside `<Providers>`:

```tsx
import { GenieStickyBar } from "@/components/genie/GenieStickyBar";

// ... existing code ...

<Providers>
  {children}
  <GenieStickyBar />
</Providers>
```

**Step 4: Delete old files**

```bash
rm src/components/landing/GenieSection.tsx
rm src/components/landing/__tests__/GenieSection.test.tsx
```

**Step 5: Run all tests**

Run: `npx vitest run`
Expected: All pass. Old GenieSection tests are gone, new genie tests pass, homepage test still passes.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: wire GenieStickyBar into layout, remove GenieSection from homepage"
```

---

### Task 7: Full test suite verification and cleanup

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All pass

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 4: Final commit if any cleanup needed**

If lint or build reveals issues, fix and commit.
