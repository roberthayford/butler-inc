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
