import { describe, expect, it } from "vitest";
import {
  PHONE_TOO_SHORT_MESSAGE,
  normalizePhoneNumber,
  phoneNumberSchema,
} from "../phone";

describe("phone number validation", () => {
  it("accepts UK mobile numbers and stores E.164", () => {
    expect(normalizePhoneNumber("07700 900000")).toEqual({
      ok: true,
      value: "+447700900000",
    });
  });

  it("rejects UK mobile numbers that are one digit short", () => {
    expect(normalizePhoneNumber("07700 90000")).toEqual({
      ok: false,
      message: PHONE_TOO_SHORT_MESSAGE,
    });
  });

  it("accepts UK landline numbers from 10 to 11 digits", () => {
    expect(normalizePhoneNumber("020 7946 0018")).toEqual({
      ok: true,
      value: "+442079460018",
    });
    expect(normalizePhoneNumber("020 7946 018")).toEqual({
      ok: true,
      value: "+44207946018",
    });
  });

  it("accepts international numbers with country code", () => {
    expect(normalizePhoneNumber("+1 415 555 2671")).toEqual({
      ok: true,
      value: "+14155552671",
    });
  });

  it("rejects international numbers shorter than the country minimum", () => {
    expect(normalizePhoneNumber("+1 415 555 267")).toEqual({
      ok: false,
      message: PHONE_TOO_SHORT_MESSAGE,
    });
  });

  it("normalizes zod schema output to E.164", () => {
    expect(phoneNumberSchema.parse("07700 900000")).toBe("+447700900000");
  });
});
