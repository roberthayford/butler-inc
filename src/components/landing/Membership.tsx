import { Button } from "@/components/ui/button";
import { membershipTiers } from "@/data/membership-tiers";

const Membership = () => {
  return (
    <section id="membership" className="section-padding bg-charcoal text-primary-foreground">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-serif text-3xl md:text-4xl font-medium text-center mb-4">
          How You Pay
        </h2>
        <p className="text-primary-foreground/70 text-center mb-12 max-w-xl mx-auto">
          Regular access or occasional use. Either works.
        </p>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Membership Card */}
          <div className="p-8 rounded-2xl bg-primary-foreground/5 border border-primary-foreground/10 backdrop-blur transition-all duration-300 hover:bg-primary-foreground/10 hover:border-primary-foreground/20 hover:-translate-y-1 hover:shadow-2xl">
            <span className="inline-block text-xs font-medium uppercase tracking-wider text-brass mb-4">
              Recommended
            </span>
            <h3 className="font-serif text-2xl font-medium mb-4">Membership</h3>
            <p className="text-primary-foreground/70 mb-6">
              Priority access. Better rates. Your dedicated line.
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3 text-sm">
                <span className="text-brass">✓</span>
                Priority time slots
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="text-brass">✓</span>
                Access to Genie in a Butler service
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="text-brass">✓</span>
                Dedicated member helpline
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="text-brass">✓</span>
                Discounted hourly rate vs PAYG
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="text-brass">✓</span>
                Free virtual butler task credits
              </li>
            </ul>

            <div className="mb-6 p-4 rounded-lg bg-primary-foreground/5">
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                {membershipTiers.map((tier) => (
                  <div key={tier.name}>
                    <p className="text-primary-foreground/50 mb-1">{tier.name}</p>
                    <p className="font-medium">{tier.credits} credits</p>
                    <p className="text-primary-foreground/70 text-xs">{tier.discount}</p>
                    <p className="text-red-400 text-xs mt-1">🧞 {tier.genieAllowance}</p>
                  </div>
                ))}
              </div>
            </div>

            <Button variant="secondary" size="lg" className="w-full">
              Explore Membership
            </Button>
          </div>

          {/* PAYG Card */}
          <div className="p-8 rounded-2xl bg-primary-foreground/5 border border-primary-foreground/10 backdrop-blur transition-all duration-300 hover:bg-primary-foreground/10 hover:border-primary-foreground/20 hover:-translate-y-1 hover:shadow-2xl">
            <span className="inline-block text-xs font-medium uppercase tracking-wider text-primary-foreground/50 mb-4">
              Flexible
            </span>
            <h3 className="font-serif text-2xl font-medium mb-4">Pay As You Go</h3>
            <p className="text-primary-foreground/70 mb-6">
              Book when you need. Pay only for what you use.
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3 text-sm">
                <span className="text-brass">✓</span>
                Only pay for what you book
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="text-brass">✓</span>
                Personal Butler services only
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="text-brass">✓</span>
                Transparent, dynamic pricing
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="text-brass">✓</span>
                Book instantly, no sign-up required
              </li>
            </ul>

            <div className="mb-6 p-4 rounded-lg bg-primary-foreground/5 text-center">
              <p className="text-primary-foreground/50 text-sm mb-1">Starting from</p>
              <p className="font-serif text-3xl font-medium">£20<span className="text-lg text-primary-foreground/70"> per hour</span></p>
            </div>

            <Button variant="outline" size="lg" className="w-full bg-transparent border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground hover:text-charcoal">
              Book Now
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Membership;