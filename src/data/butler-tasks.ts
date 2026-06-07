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
      label:
        "Business and office errands including photocopying, binding, lamination etc",
    },
    {
      id: "personal",
      label: "Personal, confidential or sensitive errands",
    },
    { id: "stand-in", label: "Stand in, proxy attendance" },
    { id: "cross-country", label: "Cross country errands" },
    { id: "corporate-events", label: "Corporate events" },
    {
      id: "meeting-secretaries",
      label: "Meeting secretaries and assistants",
    },
    { id: "gifting", label: "Corporate and personal gifting" },
    { id: "other", label: "Other" },
  ],
  baby: [
    { id: "school-runs", label: "School runs" },
    {
      id: "recital-recording",
      label: "School plays, sports games, recitals etc attendance for filming",
    },
    { id: "babysitting", label: "Baby sitting" },
    { id: "night-nurse", label: "Night Nurse" },
    { id: "forgotten-items", label: "Forgotten items runs to school" },
    { id: "parent-respite", label: "Parent respite" },
    {
      id: "activity-planning",
      label: "Kids parties, activities and playdates attendance",
    },
    { id: "welfare-checks", label: "Welfare checks on elderly" },
    {
      id: "elderly-assistance",
      label: "Elderly assistance to appointments and check-ups",
    },
    {
      id: "gift-packs",
      label: "Personalised gift packs created and delivered for kids' birthdays",
    },
    {
      id: "kids-shopping",
      label: "Kids clothing and essentials shopping and errands",
    },
    { id: "teenager-checkins", label: "Teenager check-ins" },
    { id: "other", label: "Other" },
  ],
  bougie: [
    { id: "rare-sourcing", label: "Sourcing rare or high value items" },
    { id: "gift-packages", label: "Personalised gift experiences" },
    { id: "special-order", label: "Special order involving travel" },
    { id: "private-jet-island", label: "Private jet and private island bookings" },
    { id: "holiday-planning", label: "Luxury holiday planning" },
    {
      id: "personal-shopper-returns",
      label:
        "Personal shopper errands, including multiple items store pick-ups and returns",
    },
    {
      id: "nightclub-booking",
      label: "Night club bookings and table service experiences with attendants",
    },
    {
      id: "grocery-specialist",
      label: "High end and specialist grocery stores shopping and delivery",
    },
    { id: "wait-staff", label: "Wait staff for dinner parties" },
    {
      id: "travel-concierge",
      label:
        "Travel concierge including packing and unpacking of luggage plus delivery of luggage",
    },
    { id: "other", label: "Other" },
  ],
  base: [
    {
      id: "house-waiting",
      label:
        "House waiting and monitoring of external service providers e.g. installations, fumigations, renovations",
    },
    {
      id: "property-management",
      label: "Vacant property management and maintenance",
    },
    {
      id: "key-holding",
      label: "Key holding, mail sorting, delivery acceptance, plant watering",
    },
    { id: "pickups", label: "Errands to pick-up and drop-off forgotten items" },
    { id: "wait-staff", label: "Wait staff during dinner parties" },
    { id: "grocery-delivery", label: "Grocery delivery and set up" },
    {
      id: "welcome-home",
      label:
        "Welcome home services: house set up, fridge stocking, cleaners and gardeners coordination",
    },
    { id: "other", label: "Other" },
  ],
  budget: [
    { id: "errands", label: "General errands and household tasks" },
    { id: "grocery", label: "Grocery shopping and delivery" },
    { id: "plant-care", label: "Plant watering and home checks" },
    { id: "returns", label: "Returns, exchanges, and drop-offs" },
    {
      id: "mail-packages",
      label: "Mail sorting, package collection and mail redirection",
    },
    { id: "non-urgent-shopping", label: "Non-urgent shopping" },
    { id: "other", label: "Other" },
  ],
  bespoke: [],
};
