import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How much does it cost?",
    answer: "Starting from £20 per hour for Budget Butler. Same-day and premium services are priced accordingly. You see the exact cost before you book.",
  },
  {
    question: "How does smart pricing work?",
    answer: "Off-peak slots and route-efficient bookings cost less. Same-day urgency costs more. Price displayed before you confirm.",
  },
  {
    question: "Can I book without a membership?",
    answer: "Yes. Pay As You Go is instant, requires no sign-up, and covers all Personal Butler services. Members enjoy better rates and additional features.",
  },
  {
    question: "How does the body-cam work?",
    answer: "For Baby Butler and Base Butler: encrypted live-stream, visible only to you. No recordings stored. You control access.",
  },
  {
    question: "Do you cover my area?",
    answer: "Same-day service in Cambridge and London. Anywhere in England reachable by car or train is eligible—distance pricing applies outside core zones.",
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
              <AccordionTrigger className="text-left font-serif text-lg font-medium py-6 hover:no-underline hover:text-brass transition-all duration-300 active:scale-[0.98] origin-left">
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