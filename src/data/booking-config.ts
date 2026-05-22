export const DAY_OPTIONS = [
  {
    key: "sameDay",
    label: "Same Day",
    priceLabel: "from £70/hr",
    priceFrom: 70,
  },
  {
    key: "nextDay",
    label: "Next Day",
    priceLabel: "from £55/hr",
    priceFrom: 55,
  },
  {
    key: "advance",
    label: "72+ Hours Notice",
    priceLabel: "from £35/hr",
    priceFrom: 35,
    requiresDatePicker: true,
  },
] as const;

export const TIME_SLOTS = [
  { key: "morning", label: "Morning", times: "7:00 - 11:59" },
  { key: "noon", label: "Noon", times: "12:00 - 16:59" },
  { key: "evening", label: "Evening", times: "17:00 - 21:00" },
] as const;

export const GENIE_SERVICE = {
  serviceOption: "genie",
  leadTimeHours: 0,
  responsePromise: "Response within 30 minutes",
  bookingMode: "immediate_response",
} as const;

export type DayOptionKey = (typeof DAY_OPTIONS)[number]["key"];
export type TimeSlotKey = (typeof TIME_SLOTS)[number]["key"];
