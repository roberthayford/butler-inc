export type ServiceId = "busy" | "baby" | "bougie" | "base" | "budget" | "bespoke";

export interface Service {
    id: ServiceId;
    name: string;
    shortName: string;
    subtitle: string;
    image: string;
    examples: string[];
    priceFrom: string;
}

export const services: Service[] = [
    {
        id: "busy",
        name: "Busy Butler",
        shortName: "Busy",
        subtitle: "Urgent professional logistics",
        image: "/images/busy-butler.png",
        examples: [
            "Pick up passport, deliver to HM Passport Office, wait and return it",
            "Get document notarised and personally deliver to Edinburgh",
            "Emergency pickup and same-day hand delivery",
        ],
        priceFrom: "",
    },
    {
        id: "baby",
        name: "Baby Butler",
        shortName: "Baby",
        subtitle: "School runs & care checks",
        image: "/images/baby-butler.png",
        examples: [
            "School pick-up when you have an important meeting",
            "Watch your child for a few hours between activities",
            "Check on elderly relative who isn't answering the phone",
        ],
        priceFrom: "",
    },
    {
        id: "bougie",
        name: "Bougie Butler",
        shortName: "Bougie",
        subtitle: "Luxury sourcing & experiences",
        image: "/images/nano-banana.png",
        examples: [
            "Source rare scotch only sold in a tiny shop in Scotland",
            "Plan and organise a personalised family holiday",
            "Secure VIP reservations and exclusive event access",
        ],
        priceFrom: "",
    },
    {
        id: "base",
        name: "Base Butler",
        shortName: "Base",
        subtitle: "Property & home waiting",
        image: "/images/base-butler.png",
        examples: [
            "Wait for Sky broadband installation while you're at work",
            "Costco shop, fill fridge and organise cleaning before arrival",
            "Hold keys and coordinate with tradesmen",
        ],
        priceFrom: "",
    },
    {
        id: "budget",
        name: "Budget Butler",
        shortName: "Budget",
        subtitle: "For when you can be flexible on timing",
        image: "/images/budget-butler.png",
        examples: [
            "Water plants while you're away",
            "Do a big weekly shop and stock the fridge",
            "Non-urgent errands with flexible timing",
        ],
        priceFrom: "",
    },
    {
        id: "bespoke",
        name: "Bespoke Butler",
        shortName: "Bespoke",
        subtitle: "Custom requests",
        image: "/images/bespoke-butler.png",
        examples: [
            "Plan and execute a dinner party with chefs and personalised menu",
            "Surprise delivery of flowers, chocolates and cake to her office at 4pm",
            "Complex multi-vendor coordination for special occasions",
        ],
        priceFrom: "",
    },
];
