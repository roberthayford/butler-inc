import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How much does it cost?",
    answer: "Pricing is dynamic based on timing, location, and demand. Budget Butler starts from £20/hr for flexible slots, while same-day urgent services are priced higher. You'll always see the exact price before booking.",
  },
  {
    question: "How does smart pricing work?",
    answer: "Our pricing engine rewards you for choosing time slots that fit existing routes. If a butler is already in your area, you'll see \"Best Value\" slots at a lower price. Book during off-peak hours for the best rates, or opt for Budget Butler with flexible timing for maximum savings. Same-day and emergency requests are available at a premium for instant response.",
  },
  {
    question: "Can I book without a membership?",
    answer: "Absolutely. Our Pay As You Go option lets you book Personal Butler services instantly with no commitment. Membership offers better rates and access to Virtual Butler services for regular users.",
  },
  {
    question: "How does the body-cam work?",
    answer: "For Baby Butler and Base Butler services, you can opt for live-streaming via an encrypted link. The stream is live-only – we don't store any recordings. You control who can access the viewing link.",
  },
  {
    question: "Do you cover my area?",
    answer: "We prioritise Cambridge and London, where same-day service is typically available. However, any location in England reachable by car or train is eligible. Distance-based pricing applies for areas outside our core hubs, with next-day or scheduled service available nationwide.",
  },
];

const FAQ = () => {
  return (
    <section className="section-padding">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-serif text-3xl md:text-4xl font-medium text-center mb-12">
          Frequently asked questions
        </h2>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border-b border-border">
              <AccordionTrigger className="text-left font-serif text-lg font-medium py-6 hover:no-underline hover:text-gold transition-all duration-300 active:scale-[0.98] origin-left">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQ;