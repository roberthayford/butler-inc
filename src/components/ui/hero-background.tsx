/**
 * Atmospheric hero backgrounds per butler type.
 * Uses layered CSS gradients + SVG noise texture for depth.
 * No stock photography — pure design craft.
 *
 * server-serialization: This is a Server Component. Only the butlerType
 * string crosses the server/client boundary.
 */

import type { ServiceId } from "@/data/services";

const BUTLER_ATMOSPHERES: Record<
  ServiceId,
  { gradient: string; accent: string }
> = {
  busy: {
    gradient:
      "radial-gradient(ellipse 80% 60% at 20% 80%, hsla(15, 70%, 45%, 0.15) 0%, transparent 60%), " +
      "radial-gradient(ellipse 60% 50% at 85% 20%, hsla(30, 45%, 48%, 0.12) 0%, transparent 55%), " +
      "radial-gradient(ellipse 100% 80% at 50% 50%, hsla(220, 20%, 14%, 1) 0%, hsla(220, 20%, 18%, 1) 100%)",
    accent: "hsla(15, 70%, 60%, 0.06)",
  },
  baby: {
    gradient:
      "radial-gradient(ellipse 70% 50% at 75% 75%, hsla(210, 60%, 50%, 0.12) 0%, transparent 60%), " +
      "radial-gradient(ellipse 50% 40% at 15% 30%, hsla(210, 40%, 55%, 0.08) 0%, transparent 50%), " +
      "radial-gradient(ellipse 100% 80% at 50% 50%, hsla(220, 20%, 14%, 1) 0%, hsla(220, 20%, 18%, 1) 100%)",
    accent: "hsla(210, 60%, 70%, 0.06)",
  },
  bougie: {
    gradient:
      "radial-gradient(ellipse 60% 45% at 30% 70%, hsla(345, 50%, 35%, 0.14) 0%, transparent 55%), " +
      "radial-gradient(ellipse 45% 35% at 80% 25%, hsla(30, 45%, 48%, 0.10) 0%, transparent 50%), " +
      "radial-gradient(ellipse 100% 80% at 50% 50%, hsla(220, 22%, 13%, 1) 0%, hsla(220, 20%, 18%, 1) 100%)",
    accent: "hsla(345, 50%, 45%, 0.06)",
  },
  base: {
    gradient:
      "radial-gradient(ellipse 65% 55% at 50% 80%, hsla(30, 45%, 40%, 0.12) 0%, transparent 60%), " +
      "radial-gradient(ellipse 55% 40% at 10% 20%, hsla(30, 30%, 45%, 0.08) 0%, transparent 50%), " +
      "radial-gradient(ellipse 100% 80% at 50% 50%, hsla(220, 20%, 14%, 1) 0%, hsla(220, 20%, 18%, 1) 100%)",
    accent: "hsla(30, 45%, 48%, 0.06)",
  },
  budget: {
    gradient:
      "radial-gradient(ellipse 70% 50% at 80% 70%, hsla(145, 40%, 35%, 0.12) 0%, transparent 55%), " +
      "radial-gradient(ellipse 50% 40% at 20% 25%, hsla(145, 30%, 40%, 0.08) 0%, transparent 50%), " +
      "radial-gradient(ellipse 100% 80% at 50% 50%, hsla(220, 20%, 14%, 1) 0%, hsla(220, 20%, 18%, 1) 100%)",
    accent: "hsla(145, 40%, 50%, 0.06)",
  },
  bespoke: {
    gradient:
      "radial-gradient(ellipse 55% 45% at 25% 65%, hsla(270, 40%, 40%, 0.12) 0%, transparent 55%), " +
      "radial-gradient(ellipse 50% 35% at 75% 30%, hsla(30, 45%, 48%, 0.10) 0%, transparent 50%), " +
      "radial-gradient(ellipse 100% 80% at 50% 50%, hsla(220, 22%, 13%, 1) 0%, hsla(220, 20%, 18%, 1) 100%)",
    accent: "hsla(270, 40%, 55%, 0.06)",
  },
};

/**
 * Inline SVG noise texture as a data URI.
 * Renders a subtle grain overlay for depth — the hallmark of premium digital design.
 */
const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`;

interface HeroBackgroundProps {
  butlerType: ServiceId;
  children: React.ReactNode;
  className?: string;
}

export function HeroBackground({
  butlerType,
  children,
  className = "",
}: HeroBackgroundProps) {
  const atmosphere = BUTLER_ATMOSPHERES[butlerType];

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Base gradient layer */}
      <div
        className="absolute inset-0"
        style={{ background: atmosphere.gradient }}
      />

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: NOISE_SVG,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

      {/* Subtle geometric accent — a single diagonal line that feels intentional */}
      <div
        className="absolute inset-0 opacity-100"
        style={{
          background: `linear-gradient(135deg, transparent 40%, ${atmosphere.accent} 50%, transparent 60%)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/**
 * Landing page hero background — no butler type, uses brand charcoal with brass warmth.
 */
export function LandingHeroBackground({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Deep charcoal with warm brass radials */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 100%, hsla(30, 45%, 35%, 0.10) 0%, transparent 60%), " +
            "radial-gradient(ellipse 60% 40% at 80% 20%, hsla(30, 30%, 45%, 0.06) 0%, transparent 50%), " +
            "radial-gradient(ellipse 40% 30% at 10% 40%, hsla(220, 30%, 25%, 0.15) 0%, transparent 50%), " +
            "linear-gradient(to bottom, hsl(220, 20%, 15%), hsl(220, 20%, 18%))",
        }}
      />

      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: NOISE_SVG,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
