import { Button } from "@/components/ui/button";

const Membership = () => {
  return (
    <section id="membership" className="section-padding bg-charcoal text-primary-foreground">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-serif text-3xl md:text-4xl font-medium text-center mb-4">
          Membership or Pay As You Go
        </h2>
        <p className="text-primary-foreground/70 text-center mb-12 max-w-xl mx-auto">
          Choose the option that fits your lifestyle. No wrong answers here.
        </p>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Membership Card */}
          <div className="p-8 rounded-2xl bg-primary-foreground/5 border border-primary-foreground/10 backdrop-blur">
            <span className="inline-block text-xs font-medium uppercase tracking-wider text-gold mb-4">
              Best Value
            </span>
            <h3 className="font-serif text-2xl font-medium mb-4">Membership</h3>
            <p className="text-primary-foreground/70 mb-6">
              For regular users who want the best rates and priority access.
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3 text-sm">
                <span className="text-gold">✓</span>
                Lower per-visit cost
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="text-gold">✓</span>
                Access to Virtual & Personal Butler services
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="text-gold">✓</span>
                Priority access to popular time slots
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="text-gold">✓</span>
                Dedicated concierge support
              </li>
            </ul>

            <div className="mb-6 p-4 rounded-lg bg-primary-foreground/5">
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <p className="text-primary-foreground/50 mb-1">Light</p>
                  <p className="font-medium">5 virtual</p>
                  <p className="text-primary-foreground/70">3 personal</p>
                </div>
                <div>
                  <p className="text-primary-foreground/50 mb-1">Standard</p>
                  <p className="font-medium">12 virtual</p>
                  <p className="text-primary-foreground/70">6 personal</p>
                </div>
                <div>
                  <p className="text-primary-foreground/50 mb-1">Premium</p>
                  <p className="font-medium">20 virtual</p>
                  <p className="text-primary-foreground/70">10 personal</p>
                </div>
              </div>
            </div>

            <Button variant="secondary" size="lg" className="w-full">
              View Membership Packages
            </Button>
          </div>

          {/* PAYG Card */}
          <div className="p-8 rounded-2xl bg-primary-foreground/5 border border-primary-foreground/10 backdrop-blur">
            <span className="inline-block text-xs font-medium uppercase tracking-wider text-primary-foreground/50 mb-4">
              No Commitment
            </span>
            <h3 className="font-serif text-2xl font-medium mb-4">Pay As You Go</h3>
            <p className="text-primary-foreground/70 mb-6">
              Perfect for occasional tasks without any ongoing commitment.
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3 text-sm">
                <span className="text-gold">✓</span>
                Only pay for what you book
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="text-gold">✓</span>
                Personal Butler services only
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="text-gold">✓</span>
                Transparent, dynamic pricing
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="text-gold">✓</span>
                Book instantly, no sign-up required
              </li>
            </ul>

            <div className="mb-6 p-4 rounded-lg bg-primary-foreground/5 text-center">
              <p className="text-primary-foreground/50 text-sm mb-1">Starting from</p>
              <p className="font-serif text-3xl font-medium">£20<span className="text-lg text-primary-foreground/70">/hr</span></p>
              <p className="text-primary-foreground/50 text-sm mt-1">Dynamic pricing based on timing</p>
            </div>

            <Button variant="outline" size="lg" className="w-full border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
              Book as PAYG
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Membership;