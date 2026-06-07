"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GENIE_SERVICE } from "@/data/booking-config";

const EXAMPLE_WISHES = [
  "Arrange emergency childcare for tonight",
  "Arrange a private chef for 12 guests in under 3 hours",
  "Find and book a villa in Santorini departing this Friday",
] as const;

const PREMIUM_EASE = [0.22, 1, 0.36, 1] as const;
const GENIE_TAGLINE = "For when the butlers aren't quick enough";
const GENIE_PROMPT = "Tell us what you want and we will make it happen";

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

  useEffect(() => {
    if (phase === "success") {
      const timer = setTimeout(() => {
        onClose();
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
      <motion.div
        data-testid="genie-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

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
                  {GENIE_TAGLINE}
                </h2>
                <p className="text-warm-gray mt-2 text-sm leading-relaxed">
                  {GENIE_PROMPT}
                </p>
                <p className="mt-3 text-sm font-medium text-destructive">
                  {GENIE_SERVICE.responsePromise}
                </p>

                <div className="mt-5">
                  <label htmlFor="genie-wish" className="sr-only">
                    Your wish
                  </label>
                  <textarea
                    id="genie-wish"
                    value={wish}
                    onChange={(e) => setWish(e.target.value)}
                    placeholder="Describe what you need..."
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
