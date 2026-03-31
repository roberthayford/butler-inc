import { ServiceId } from './services';

/**
 * SEO metadata for each butler type
 */
export interface ButlerSEO {
    title: string;
    description: string;
    keywords: string[];
}

/**
 * Hero section content for each butler type
 */
export interface ButlerHero {
    headline: string;
    subheading: string;
    useCases: string[];
}

/**
 * How It Works step
 */
export interface HowItWorksStep {
    title: string;
    description: string;
}

/**
 * Trust indicator
 */
export interface TrustIndicator {
    text: string;
}

/**
 * Complete butler page configuration
 */
export interface ButlerPageConfig {
    seo: ButlerSEO;
    hero: ButlerHero;
    howItWorks: {
        title: string;
        steps: HowItWorksStep[];
    };
    commonRequests: string[];
    trustIndicators: TrustIndicator[];
    accentColor: string; // HSL value for subtle accents
}

/**
 * Butler page configurations indexed by service ID
 */
export const butlerPageConfigs: Record<ServiceId, ButlerPageConfig> = {
    busy: {
        seo: {
            title: 'Same-Day Courier London | Busy Butler | 2-Hour Delivery',
            description:
                'Urgent same-day courier across London. Documents, prescriptions, forgotten items delivered within 2 hours. DBS-checked butlers. Live tracking. From £35/hr.',
            keywords: [
                'same-day courier London',
                'urgent delivery service',
                'document courier',
                'prescription delivery',
                'queue standing service',
            ],
        },
        hero: {
            headline: 'When time is of the essence.',
            subheading:
                'For time-critical documents, urgent purchases, and last-minute deliveries where traditional courier and postal services will not suffice.',
            useCases: [
                'Signed contracts to clients by 5pm',
                'Forgotten birthday gift delivered this afternoon',
                'Essential medication pickup from pharmacy',
            ],
        },
        howItWorks: {
            title: 'How Busy Butler works',
            steps: [
                {
                    title: 'Tell us what',
                    description: 'Describe your urgent task and where it needs to go.',
                },
                {
                    title: 'We collect it',
                    description: 'Butler dispatched within 15 minutes of confirmation.',
                },
                {
                    title: 'You receive it',
                    description: 'Live GPS tracking until delivery complete.',
                },
            ],
        },
        commonRequests: [
            'Contract signing across London—collected and delivered same afternoon',
            "Prescription collection from pharmacy when you're unwell",
            'Birthday gift delivery you forgot to order',
            'Queue standing for limited releases or ticket lines',
            'Important documents from solicitor to client',
            'Keys collected from estate agent on moving day',
            'Urgent shopping—forgotten ingredients, replacement charger, specific item needed today',
        ],
        trustIndicators: [
            { text: 'DBS checked and reference verified' },
            { text: 'Insured for items up to £5,000' },
            { text: 'Live GPS tracking on every delivery' },
        ],
        accentColor: 'hsl(15 70% 60%)', // Warm coral
    },

    baby: {
        seo: {
            title: 'Emergency Childcare London | Baby Butler | DBS-Checked',
            description:
                'Trusted childcare and elderly care when you need it most. School runs, activity pickups, welfare checks. DBS-checked, body-cam equipped. From £35/hr.',
            keywords: [
                'emergency childcare London',
                'school pickup service',
                'elderly care check',
                'last-minute babysitter',
                'trusted childcare',
            ],
        },
        hero: {
            headline: 'Trusted care. When life gets in the way.',
            subheading:
                'For school runs, activity pickups, welfare checks for precious cargo\u2026 and when you can\'t be there yourself.',
            useCases: [
                'School pickup when your meeting runs late',
                'Watch your child between after-school activities',
                "Check on elderly relative who isn't answering",
            ],
        },
        howItWorks: {
            title: 'How Baby Butler works',
            steps: [
                {
                    title: 'Book your slot',
                    description: 'Tell us who, when, and where they need to be.',
                },
                {
                    title: 'We arrive',
                    description: 'DBS-checked butler arrives with body-cam active.',
                },
                {
                    title: 'Safe handover',
                    description: 'Live updates and safe handover confirmed.',
                },
            ],
        },
        commonRequests: [
            'School pickup when an important meeting overruns',
            'Supervision between end of school and evening activity',
            "Welfare check on elderly parent who's not responding",
            'Airport drop-off for teenager travelling alone',
            'Accompany child to medical appointment',
            'Emergency childcare when regular arrangements fall through',
        ],
        trustIndicators: [
            { text: 'Enhanced DBS check verified Butlers' },
            { text: 'Body-cam equipped for your peace of mind' },
            { text: 'Real-time photo updates sent to you' },
        ],
        accentColor: 'hsl(210 60% 70%)', // Soft blue
    },

    bougie: {
        seo: {
            title: 'Luxury Concierge London | Bougie Butler | VIP Access',
            description:
                'Exclusive sourcing, VIP reservations, and luxury experiences. Rare spirits, sold-out events, impossible tables. Your personal luxury concierge.',
            keywords: [
                'luxury concierge London',
                'VIP restaurant reservations',
                'rare whisky sourcing',
                'exclusive event access',
                'personal shopper',
            ],
        },
        hero: {
            headline: 'A butler to secure the finer things in life.',
            subheading:
                'For rare finds, exclusive reservations, and luxury experiences tailored to you.',
            useCases: [
                'Source a sold-out vintage from a Scottish distillery',
                'Secure a table at that restaurant with a 3-month wait',
                'VIP access to exclusive events and launches',
            ],
        },
        howItWorks: {
            title: 'How Bougie Butler works',
            steps: [
                {
                    title: 'Share your wish',
                    description: 'Tell us what you\'re after. We\'ll confirm what\'s possible within the hour.',
                },
                {
                    title: 'We source it',
                    description: 'Our network and relationships unlock what others can\'t.',
                },
                {
                    title: 'Delivered to you',
                    description: 'White-glove presentation to your door or venue.',
                },
            ],
        },
        commonRequests: [
            'Rare Scotch only sold in a tiny Highland shop—sourced and delivered',
            'Anniversary dinner at a fully-booked Michelin restaurant',
            'Front-row seats to sold-out West End shows',
            'Custom gift curation for high-net-worth clients',
            'Private viewing arrangements at auction houses',
            'Personalised luxury holiday planning and booking',
            'Nightclub booking and VIP table service',
        ],
        trustIndicators: [
            { text: 'Exclusive network access' },
            { text: 'Vetted, discreet professionals' },
            { text: '5-star service guarantee' },
        ],
        accentColor: 'hsl(345 50% 45%)', // Rich burgundy
    },

    base: {
        seo: {
            title: 'Property Management London | Base Butler | Home Waiting',
            description:
                'Professional property waiting, key holding, and home management. Wait for deliveries, coordinate tradesmen, prepare your home. From £35/hr.',
            keywords: [
                'property waiting service London',
                'key holding service',
                'wait for delivery',
                'tradesman coordination',
                'home preparation service',
            ],
        },
        hero: {
            headline: 'Your home, handled. While you\'re away.',
            subheading:
                'For deliveries, tradesmen, and property needs\u2026 whether you\'re home or away.',
            useCases: [
                'Wait for Sky broadband installation while you\'re at work',
                'Stock the fridge and prepare your home before arrival',
                'Hold keys and let in cleaners or contractors',
            ],
        },
        howItWorks: {
            title: 'How Base Butler works',
            steps: [
                {
                    title: 'Hand over access',
                    description: 'Provide keys or access codes securely.',
                },
                {
                    title: 'We manage it',
                    description: 'Butler on-site, handling exactly what you need.',
                },
                {
                    title: 'You\'re updated',
                    description: 'Photo confirmation and handover report sent.',
                },
            ],
        },
        commonRequests: [
            'Wait all day for a delivery with a 4-hour window',
            'Let in and supervise electrician or plumber',
            'Prepare rental property for new tenants',
            'Stock fridge and make beds before family arrival',
            'Plant watering and mail collection while on holiday',
            'Coordinate multiple tradesmen on renovation day',
        ],
        trustIndicators: [
            { text: 'DBS checked and insured' },
            { text: 'Body-cam available on request' },
            { text: 'Secure key handling protocols' },
        ],
        accentColor: 'hsl(var(--brass))', // Antique Brass
    },

    budget: {
        seo: {
            title: 'Affordable Errand Service London | Budget Butler | From £35/hr',
            description:
                'Quality errand service at accessible prices. Flexible timing for non-urgent tasks. Shopping, returns, admin runs. From £35/hr.',
            keywords: [
                'affordable errand service London',
                'cheap personal assistant',
                'budget concierge service',
                'flexible errand runner',
                'personal shopper London',
            ],
        },
        hero: {
            headline: 'For the more flexible client\u2026',
            subheading:
                'For tasks that need doing, but don\'t need doing today.',
            useCases: [
                'Weekly grocery shop and fridge stocking',
                'Water plants while you\'re on holiday',
                'Return packages to multiple locations',
            ],
        },
        howItWorks: {
            title: 'How Budget Butler works',
            steps: [
                {
                    title: 'Flexible booking',
                    description: 'Choose a date range—we fit it in when it\'s most cost-effective for you.',
                },
                {
                    title: 'Best rates',
                    description: 'Lower prices because we optimise our schedule.',
                },
                {
                    title: 'Task complete',
                    description: 'Photo confirmation when done.',
                },
            ],
        },
        commonRequests: [
            'Big weekly Costco shop delivered and unpacked',
            'Return online shopping to multiple stores',
            'Water plants and check on home weekly',
            'Charity shop drop-off of clothes and items',
            'Queue for non-urgent admin (post office, bank)',
            'Pick up dry cleaning on a flexible schedule',
        ],
        trustIndicators: [
            { text: 'DBS checked, same standards' },
            { text: 'Transparent pricing, no surprises' },
            { text: 'Flexible scheduling saves you money' },
        ],
        accentColor: 'hsl(145 40% 50%)', // Sage/Green
    },

    bespoke: {
        seo: {
            title: 'Custom Concierge Requests | Bespoke Butler | Tailored Solutions',
            description:
                'For requests that don\'t fit a category. Complex coordination, special occasions, unique challenges. Tell us what you need—we\'ll make it happen.',
            keywords: [
                'bespoke concierge London',
                'custom butler service',
                'event coordination',
                'personal assistant London',
                'special occasion planning',
            ],
        },
        hero: {
            headline: 'Tell us what you need. We\'ll figure it out.',
            subheading:
                'For requests that don\'t fit a category—complex, creative, or completely unique.',
            useCases: [
                'Coordinate a surprise proposal across three locations',
                'Plan and execute a private dinner party for 20',
                'Manage a house move while you\'re abroad',
            ],
        },
        howItWorks: {
            title: 'How Bespoke Butler works',
            steps: [
                {
                    title: 'Brief us',
                    description: 'Describe your challenge or vision in detail.',
                },
                {
                    title: 'We plan it',
                    description: 'Custom proposal with timeline and transparent pricing.',
                },
                {
                    title: 'We deliver',
                    description: 'End-to-end execution with regular updates.',
                },
            ],
        },
        commonRequests: [
            'Surprise delivery of flowers, chocolates, and cake to her office at 4pm',
            'Plan and execute a birthday dinner with personalised touches',
            'Complex multi-vendor coordination for a wedding anniversary',
            'Manage entire house move: packing, transit, unpacking',
            'Source and install home office setup while owner is away',
            'If you can describe it, consider it arranged',
        ],
        trustIndicators: [
            { text: 'Senior butler assigned to complex requests' },
            { text: 'Fully insured operations' },
            { text: 'White-glove service standard' },
        ],
        accentColor: 'hsl(270 40% 55%)', // Lavender/Purple
    },
};
