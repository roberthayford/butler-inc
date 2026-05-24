import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";

import AboutPage from "../about/page";
import RefundPage from "../refund/page";
import CookiesPage from "../cookies/page";
import IcoPage from "../ico/page";
import CareersPage from "../careers/page";
import ContactPage from "../contact/page";
import FaqsPage from "../faqs/page";

const cases: Array<{
  name: string;
  Component: () => React.ReactElement;
  title: string;
  subtitle: string;
}> = [
  { name: "/about", Component: AboutPage, title: "About Us", subtitle: "The story is still being told." },
  { name: "/refund", Component: RefundPage, title: "Refund Policy", subtitle: "Refunds, written precisely." },
  { name: "/cookies", Component: CookiesPage, title: "Cookie Policy", subtitle: "Tracking the small print." },
  { name: "/ico", Component: IcoPage, title: "ICO Membership", subtitle: "Registration in progress." },
  { name: "/careers", Component: CareersPage, title: "Careers", subtitle: "We're hiring soon — quietly first." },
  { name: "/contact", Component: ContactPage, title: "Contact Us", subtitle: "Our line will be open soon." },
  { name: "/faqs", Component: FaqsPage, title: "FAQs", subtitle: "Questions, queued." },
];

describe("Placeholder pages", () => {
  for (const { name, Component, title, subtitle } of cases) {
    it(`${name} renders title and subtitle`, () => {
      render(<Component />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(title);
      expect(screen.getByText(subtitle)).toBeInTheDocument();
      expect(screen.getByText("Check back shortly.")).toBeInTheDocument();
    });
  }
});
