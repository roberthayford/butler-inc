"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { GENIE_SERVICE } from "@/data/booking-config";

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

export function GenieSection() {
  const [phase, setPhase] = useState<Phase>("wish");
  const [wish, setWish] = useState("");
  const [contact, setContact] = useState<ContactFields>({
    name: "",
    email: "",
    phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  const contactValid =
    contact.name.trim() !== "" &&
    contact.email.trim() !== "" &&
    contact.phone.trim() !== "";

  useEffect(() => {
    if (phase === "contact") {
      const timer = setTimeout(() => {
        sectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const handleSummon = () => {
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

      if (!res.ok) {
        throw new Error("Server error");
      }

      setPhase("success");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.section
      ref={sectionRef}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: PREMIUM_EASE }}
      className="relative py-20 md:py-28 px-6 bg-charcoal overflow-hidden"
    >
      {/* Radial red glow — atmospheric background */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[600px] h-[600px] rounded-full bg-destructive/[0.04] blur-[120px]" />
      </div>

      <div className="relative max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {phase === "wish" && (
            <motion.div
              key="wish"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: PREMIUM_EASE }}
            >
              <motion.span
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, ease: PREMIUM_EASE }}
                className="inline-block text-xs uppercase tracking-[0.25em] text-destructive font-medium"
              >
                Genie In a Butler
              </motion.span>

              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.5,
                  delay: 0.08,
                  ease: PREMIUM_EASE,
                }}
                className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-optical-white mt-3 tracking-tight leading-tight"
              >
                Have an impossible wish?
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.45,
                  delay: 0.16,
                  ease: PREMIUM_EASE,
                }}
                className="text-warm-gray mt-4 leading-relaxed max-w-lg"
              >
                Tell us what you want. We{"'"}ll make it happen.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.45,
                  delay: 0.2,
                  ease: PREMIUM_EASE,
                }}
                className="mt-3 text-sm font-medium text-destructive"
              >
                {GENIE_SERVICE.responsePromise}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.45,
                  delay: 0.24,
                  ease: PREMIUM_EASE,
                }}
                className="mt-8"
              >
                <label htmlFor="genie-wish" className="sr-only">
                  Your wish
                </label>
                <textarea
                  id="genie-wish"
                  value={wish}
                  onChange={(e) => setWish(e.target.value)}
                  placeholder="Describe your impossible wish..."
                  rows={4}
                  className="w-full p-4 rounded-sm bg-primary-foreground/4 border border-primary-foreground/15 text-optical-white placeholder:text-warm-gray/50 resize-none focus:outline-none focus:border-destructive/40 focus:ring-1 focus:ring-destructive/20 transition-colors duration-300"
                />
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.4,
                  delay: 0.3,
                  ease: PREMIUM_EASE,
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSummon}
                disabled={!wish.trim()}
                className="mt-4 w-full py-3.5 rounded-sm bg-destructive text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:bg-destructive/90 hover:shadow-[0_0_24px_rgba(223,49,49,0.25)] active:shadow-none"
              >
                Summon Your Genie
              </motion.button>

              <motion.ul
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4, ease: PREMIUM_EASE }}
                className="mt-10 space-y-2.5"
              >
                {EXAMPLE_WISHES.map((example, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.35,
                      delay: 0.45 + i * 0.06,
                      ease: PREMIUM_EASE,
                    }}
                    className="text-xs text-warm-gray/60 leading-relaxed flex items-start gap-2.5"
                  >
                    <span className="text-destructive/40 mt-px shrink-0">
                      &bull;
                    </span>
                    <span>{example}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          )}

          {phase === "contact" && (
            <motion.div
              key="contact"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: PREMIUM_EASE }}
            >
              <span className="inline-block text-xs uppercase tracking-[0.25em] text-destructive font-medium">
                Genie In a Butler
              </span>

              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-optical-white mt-3 tracking-tight">
                Almost there
              </h2>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1, ease: PREMIUM_EASE }}
                className="mt-6 p-4 rounded-sm bg-primary-foreground/4 border border-primary-foreground/10 border-l-2 border-l-destructive/40"
              >
                <p className="text-optical-white text-sm italic leading-relaxed">
                  {wish}
                </p>
              </motion.div>

              <div className="mt-6 space-y-4">
                {(
                  [
                    {
                      id: "genie-name",
                      label: "Full name",
                      type: "text",
                      field: "name" as const,
                      placeholder: "Jane Smith",
                    },
                    {
                      id: "genie-email",
                      label: "Email",
                      type: "email",
                      field: "email" as const,
                      placeholder: "you@example.com",
                    },
                    {
                      id: "genie-phone",
                      label: "Phone",
                      type: "tel",
                      field: "phone" as const,
                      placeholder: "07700 900000",
                    },
                  ] as const
                ).map((input, i) => (
                  <motion.div
                    key={input.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: 0.15 + i * 0.06,
                      ease: PREMIUM_EASE,
                    }}
                  >
                    <label
                      htmlFor={input.id}
                      className="block text-sm text-optical-white/90 mb-1.5 font-medium"
                    >
                      {input.label}
                    </label>
                    <input
                      id={input.id}
                      type={input.type}
                      value={contact[input.field]}
                      onChange={(e) =>
                        setContact((c) => ({
                          ...c,
                          [input.field]: e.target.value,
                        }))
                      }
                      placeholder={input.placeholder}
                      className="w-full p-3 rounded-sm bg-primary-foreground/4 border border-primary-foreground/15 text-optical-white placeholder:text-warm-gray/50 focus:outline-none focus:border-destructive/40 focus:ring-1 focus:ring-destructive/20 transition-colors duration-300"
                    />
                  </motion.div>
                ))}
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 text-destructive text-sm"
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.35, ease: PREMIUM_EASE }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={!contactValid || isSubmitting}
                className="mt-6 w-full py-3.5 rounded-sm bg-destructive text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:bg-destructive/90 hover:shadow-[0_0_24px_rgba(223,49,49,0.25)] active:shadow-none"
              >
                {isSubmitting ? "Sending..." : "Submit Your Wish"}
              </motion.button>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.4, ease: PREMIUM_EASE }}
                onClick={() => setPhase("wish")}
                className="mt-3 w-full py-2 text-warm-gray/60 text-sm hover:text-warm-gray transition-colors"
              >
                Back
              </motion.button>
            </motion.div>
          )}

          {phase === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: PREMIUM_EASE }}
              className="text-center py-8"
            >
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15, ease: PREMIUM_EASE }}
              >
                <span className="inline-block w-12 h-12 rounded-full bg-destructive/10 mb-6">
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
              </motion.div>

              <h2 className="text-3xl font-serif font-bold text-optical-white tracking-tight">
                Wish received
              </h2>
              <p className="mt-4 text-warm-gray leading-relaxed max-w-md mx-auto">
                We{"'"}ll be in touch within the hour to discuss your request.
              </p>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3, ease: PREMIUM_EASE }}
                className="mt-8"
              >
                <Link
                  href="/butlers"
                  className="inline-block px-6 py-3 rounded-sm border border-primary-foreground/20 text-optical-white/80 text-sm hover:border-primary-foreground/40 hover:text-optical-white transition-colors duration-300"
                >
                  Browse Our Butlers
                </Link>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
