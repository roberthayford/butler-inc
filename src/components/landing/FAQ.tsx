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
    question: "Can I book without a membership?",
    answer: "Absolutely. Our Pay As You Go option lets you book Personal Butler services instantly with no commitment. Membership offers better rates and access to Virtual Butler services for regular users.",
  },
  {
    question: "How does the body-cam work?",
    answer: "For Baby Butler and Base Butler services, you can opt for live-streaming via an encrypted link. The stream is live-only – we don't store any recordings. You control who can access the viewing link.",
  },
  {
    question: "Do you cover my area?",
    answer: "We serve all of England. Our core hubs are Cambridge and London where same-day service is typically available. For other areas, we offer next-day or scheduled services with distance-based pricing.",
  },
  {
    question: "Are your butlers employees or contractors?",
    answer: "Our butlers are vetted independent contractors who meet our strict standards for professionalism, reliability, and trust. All undergo DBS checks and thorough vetting before joining our network.",
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
              <AccordionTrigger className="text-left font-serif text-lg font-medium py-6 hover:no-underline hover:text-gold transition-colors">
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