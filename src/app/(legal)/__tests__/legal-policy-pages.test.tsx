import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/test-utils";

import CookiesPage from "../cookies/page";
import PrivacyPage from "../privacy/page";
import RefundPage from "../refund/page";
import TermsPage from "../terms/page";

const cases: Array<{
  name: string;
  Component: () => React.ReactElement;
  title: string;
  section: RegExp;
  version: string;
}> = [
  {
    name: "/terms",
    Component: TermsPage,
    title: "Terms and Conditions",
    section: /^1\.\s+Introduction & definitions$/,
    version: "Terms & Conditions v1.1",
  },
  {
    name: "/privacy",
    Component: PrivacyPage,
    title: "Privacy Policy",
    section: /^1\.\s+Who we are & how to contact us$/,
    version: "Privacy Notice v1.1",
  },
  {
    name: "/refund",
    Component: RefundPage,
    title: "Refund Policy",
    section: /^2\.1\s+Refund schedule$/,
    version: "Refund Policy v1.0",
  },
  {
    name: "/cookies",
    Component: CookiesPage,
    title: "Cookie Policy",
    section: /^2\.1\s+Strictly necessary cookies$/,
    version: "Cookie Policy v1.0",
  },
];

describe("Legal policy pages", () => {
  for (const { name, Component, title, section, version } of cases) {
    it(`${name} renders imported policy content`, () => {
      render(<Component />);

      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(title);
      expect(screen.getByText(section)).toBeInTheDocument();
      expect(screen.getAllByText(new RegExp(version))).not.toHaveLength(0);
      expect(screen.queryByText("Check back shortly.")).not.toBeInTheDocument();
    });
  }
});
