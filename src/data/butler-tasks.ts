export type ButlerTypeKey =
  | "busy"
  | "baby"
  | "bougie"
  | "base"
  | "budget"
  | "bespoke";

export interface ButlerTask {
  id: string;
  label: string;
}

export const BUTLER_TASKS: Record<ButlerTypeKey, ButlerTask[]> = {
  busy: [
    { id: "courier", label: "Courier and package services" },
    {
      id: "errands",
      label: "Household errands, maintenance, decoration, organisation",
    },
    {
      id: "personal",
      label: "Personal, confidential or sensitive errands",
    },
    { id: "stand-in", label: "Stand in, proxy attendance" },
    { id: "cross-country", label: "Cross country errands" },
    { id: "procurement", label: "Procurement services" },
    { id: "gifting", label: "Corporate and personal gifting" },
    { id: "other", label: "Other" },
  ],
  baby: [
    { id: "school-runs", label: "School runs" },
    {
      id: "recital-recording",
      label: "School play and recital recording",
    },
    { id: "babysitting", label: "Baby sitting" },
    { id: "night-nurse", label: "Night Nurse" },
    { id: "forgotten-items", label: "Forgotten items runs to school" },
    { id: "parent-respite", label: "Parent respite" },
    { id: "activity-planning", label: "Kids activity planning" },
    { id: "welfare-checks", label: "Welfare checks on elderly" },
    { id: "other", label: "Other" },
  ],
  bougie: [
    { id: "rare-sourcing", label: "Sourcing rare or high value items" },
    { id: "gift-packages", label: "Personalised gift packages" },
    { id: "special-order", label: "Special order involving travel" },
    { id: "private-jet-island", label: "Private jet and private island bookings" },
    { id: "holiday-planning", label: "Luxury holiday planning" },
    { id: "personal-shopper-returns", label: "Personal shopper pick up and returns" },
    {
      id: "nightclub-booking",
      label: "Night club booking and service",
    },
    { id: "other", label: "Other" },
  ],
  base: [
    { id: "house-waiting", label: "House waiting" },
    {
      id: "property-management",
      label: "Vacant property management and maintenance",
    },
    {
      id: "key-holding",
      label: "Key holding, mail sorting, delivery acceptance, plant watering",
    },
    { id: "pickups", label: "Pick ups and drop offs, forgotten items" },
    { id: "wait-staff", label: "Wait staff during dinner parties" },
    { id: "grocery-delivery", label: "Grocery delivery and set up" },
    { id: "other", label: "Other" },
  ],
  budget: [
    { id: "errands", label: "General errands and household tasks" },
    { id: "grocery", label: "Grocery shopping and delivery" },
    { id: "plant-care", label: "Plant watering and home checks" },
    { id: "returns", label: "Returns, exchanges, and drop-offs" },
    { id: "mail-packages", label: "Mail sorting and package collection" },
    { id: "non-urgent-shopping", label: "Non-urgent shopping" },
    { id: "other", label: "Other" },
  ],
  bespoke: [],
};
