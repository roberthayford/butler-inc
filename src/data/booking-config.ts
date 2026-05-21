export const DAY_OPTIONS = [
  {
    key: "sameDay",
    label: "Same Day",
    priceLabel: "",
    priceFrom: 0,
  },
  {
    key: "nextDay",
    label: "Next Day",
    priceLabel: "",
    priceFrom: 0,
  },
  {
    key: "advance",
    label: "72+ Hours Notice",
    priceLabel: "",
    priceFrom: 0,
    requiresDatePicker: true,
  },
] as const;

export const TIME_SLOTS = [
  { key: "morning", label: "Morning", times: "7:00 - 11:59" },
  { key: "noon", label: "Noon", times: "12:00 - 16:59" },
  { key: "evening", label: "Evening", times: "17:00 - 21:00" },
] as const;

export type DayOptionKey = (typeof DAY_OPTIONS)[number]["key"];
export type TimeSlotKey = (typeof TIME_SLOTS)[number]["key"];
