import Image from "next/image";

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`;

export function LandingHeroBackground({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
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

      <div className="absolute inset-0 z-0 overflow-hidden opacity-30 mix-blend-luminosity pointer-events-none">
        <Image
          src="/images/hero-butler.png"
          alt="Premium concierge background"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/80 to-charcoal/40" />
      </div>

      <div
        className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: NOISE_SVG,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
}
