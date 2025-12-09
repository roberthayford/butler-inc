const testimonials = [
  {
    quote: "I needed an urgent passport drop-off across London – booked in 2 minutes, done in 2 hours. Absolutely seamless.",
    context: "Busy professional, London",
    service: "Busy Butler",
  },
  {
    quote: "The body-cam gives me total peace of mind during school runs. My kids love their butler, and I can focus on work.",
    context: "Parent of two, Cambridge",
    service: "Baby Butler",
  },
  {
    quote: "Living abroad, I needed someone reliable for key holding. They've coordinated three tradesmen visits flawlessly.",
    context: "Homeowner, overseas",
    service: "Base Butler",
  },
];

const Testimonials = () => {
  return (
    <section className="section-padding bg-ivory">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-serif text-3xl md:text-4xl font-medium text-center mb-16">
          Why people love Ohmybutler
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="relative">
              <div className="absolute -top-4 left-6 text-6xl text-gold/30 font-serif">"</div>
              <div className="p-6 pt-8 rounded-xl bg-background border border-border">
                <p className="text-foreground leading-relaxed mb-6 relative z-10">
                  {testimonial.quote}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{testimonial.context}</p>
                  <span className="text-xs font-medium text-gold bg-gold/10 px-2 py-1 rounded">
                    {testimonial.service}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;