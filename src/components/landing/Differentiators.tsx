const Differentiators = () => {
  return (
    <section className="section-padding bg-secondary">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16">
          {/* AI Optimised Routes */}
          <div className="relative">
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-sage-light rounded-full opacity-60 blur-2xl" />
            <div className="relative">
              <span className="inline-block text-sm font-medium text-sage uppercase tracking-wider mb-3">
                Smart Pricing
              </span>
              <h3 className="font-serif text-2xl md:text-3xl font-medium mb-4">
                Save when our butlers are nearby
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Our pricing engine rewards you for choosing time slots that fit existing routes. 
                If a butler is already in your area, you'll see "Best Value" slots at a lower price.
              </p>
              <p className="text-sm text-muted-foreground italic">
                Same-day and emergency requests available at a premium for instant response.
              </p>
            </div>
          </div>

          {/* England-wide */}
          <div className="relative">
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-gold/20 rounded-full opacity-60 blur-2xl" />
            <div className="relative">
              <span className="inline-block text-sm font-medium text-gold uppercase tracking-wider mb-3">
                Coverage
              </span>
              <h3 className="font-serif text-2xl md:text-3xl font-medium mb-4">
                England-wide, with hubs in Cambridge & London
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                We prioritise Cambridge and London, but any location reachable by car or train is eligible. 
                Distance-based pricing applies for areas outside our core hubs.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-3 text-sm">
                  <span className="w-5 h-5 rounded-full bg-sage-light flex items-center justify-center text-sage text-xs">✓</span>
                  Same-day service in core hubs
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <span className="w-5 h-5 rounded-full bg-sage-light flex items-center justify-center text-sage text-xs">✓</span>
                  Next-day / scheduled service nationwide
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Differentiators;