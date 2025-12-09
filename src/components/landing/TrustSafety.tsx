const TrustSafety = () => {
  return (
    <section className="section-padding">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-serif text-3xl md:text-4xl font-medium text-center mb-4">
          Trust, safety and privacy by design
        </h2>
        <p className="text-muted-foreground text-center mb-16 max-w-xl mx-auto">
          Every detail considered so you can focus on what matters.
        </p>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          <div className="text-center md:text-left">
            <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center mx-auto md:mx-0 mb-4">
              <span className="text-sage text-lg">✓</span>
            </div>
            <h3 className="font-serif text-xl font-medium mb-3">Vetted Butlers</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Every butler undergoes DBS background checks, identity verification, and reference checks before joining our network.
            </p>
          </div>

          <div className="text-center md:text-left">
            <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center mx-auto md:mx-0 mb-4">
              <span className="text-sage text-lg">✓</span>
            </div>
            <h3 className="font-serif text-xl font-medium mb-3">Secure & Private</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We use encrypted links and secure payment processing via Stripe. Your personal data is never sold or shared.
            </p>
          </div>

          <div className="text-center md:text-left">
            <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center mx-auto md:mx-0 mb-4">
              <span className="text-sage text-lg">✓</span>
            </div>
            <h3 className="font-serif text-xl font-medium mb-3">Body-cam Done Right</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Live-only streaming for Baby Butler and Base Butler services. No video stored. You control who can view.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSafety;