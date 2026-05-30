import { describe, expect, it } from "vitest";
import { formatButlerName } from "../format";

describe("formatButlerName", () => {
  it.each([
    ["busy", "Busy Butler"],
    ["baby", "Baby Butler"],
    ["bougie", "Bougie Butler"],
    ["base", "Base Butler"],
    ["budget", "Budget Butler"],
    ["bespoke", "Bespoke Butler"],
  ])("formats %s as %s", (input, expected) => {
    expect(formatButlerName(input)).toBe(expected);
  });
});
