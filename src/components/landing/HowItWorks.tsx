"use client";

import { motion } from "motion/react";

const STEPS = [
  { number: "01", title: "Choose Your Butler Service" },
  { number: "02", title: "Book Your Slot" },
  { number: "03", title: "We Arrive" },
  { number: "04", title: "We Hand Over" },
] as const;

export function HowItWorks() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-3xl sm:text-4xl font-serif font-bold text-optical-white text-center mb-12 tracking-tight"
        >
          How Butlers Inc. Works
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.45,
                delay: i * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="text-center"
            >
              <span className="text-3xl font-serif font-bold text-brass-text">
                {step.number}
              </span>
              <p className="mt-3 text-optical-white font-medium text-sm tracking-wide uppercase">
                {step.title}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
