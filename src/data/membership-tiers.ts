export type TierName = "Light" | "Standard" | "Premium";

export interface MembershipTier {
    name: TierName;
    credits: number;
    discount: string;
    genieAllowance: string;
}

export const membershipTiers: MembershipTier[] = [
    {
        name: "Light",
        credits: 3,
        discount: "10% off",
        genieAllowance: "1/year",
    },
    {
        name: "Standard",
        credits: 8,
        discount: "15% off",
        genieAllowance: "3/year",
    },
    {
        name: "Premium",
        credits: 15,
        discount: "20% off",
        genieAllowance: "6/year",
    },
];
