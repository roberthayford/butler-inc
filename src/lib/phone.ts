import {
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  type CountryCode,
} from "libphonenumber-js";
import { z } from "zod";

export const DEFAULT_PHONE_COUNTRY: CountryCode = "GB";

export const PHONE_INVALID_MESSAGE =
  "Please enter a valid phone number. Include the country code for non-UK numbers.";

export const PHONE_TOO_SHORT_MESSAGE =
  "Invalid Number";

export function normalizePhoneNumber(
  value: string,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY
): { ok: true; value: string } | { ok: false; message: string } {
  const input = value.trim();
  if (!input) {
    return { ok: false, message: "Phone number is required" };
  }

  const lengthIssue = validatePhoneNumberLength(input, defaultCountry);
  const phoneNumber = parsePhoneNumberFromString(input, defaultCountry);

  if (lengthIssue === "TOO_SHORT") {
    return { ok: false, message: PHONE_TOO_SHORT_MESSAGE };
  }

  if (!phoneNumber) {
    return { ok: false, message: PHONE_INVALID_MESSAGE };
  }

  const digits = input.replace(/\D/g, "");
  const isUkNationalMobile =
    phoneNumber.country === "GB" &&
    !input.trim().startsWith("+") &&
    digits.startsWith("07");

  if (isUkNationalMobile && phoneNumber.nationalNumber.length < 10) {
    return { ok: false, message: PHONE_TOO_SHORT_MESSAGE };
  }

  if (!phoneNumber.isPossible()) {
    return { ok: false, message: PHONE_INVALID_MESSAGE };
  }

  return { ok: true, value: phoneNumber.number };
}

export const phoneNumberSchema = z.string().transform((value, ctx) => {
  const result = normalizePhoneNumber(value);

  if (!result.ok) {
    ctx.addIssue({
      code: "custom",
      message: result.message,
    });
    return z.NEVER;
  }

  return result.value;
});
