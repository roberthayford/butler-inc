import { useState } from "react";
import { services, type ServiceId, type Service } from "@/data/services";
import ServiceModal from "./ServiceModal";

/**
 * ButlerCategoryGrid – Text-only luxury category selection
 * 
 * Design pattern: Matches Membership.tsx glass-morphism style
 * - Dark charcoal background
 * - Translucent glass cards with backdrop blur
 * - Subtle hover elevation
 */

interface ButlerCategoryGridProps {
    onCategorySelect?: (serviceId: ServiceId) => void;
}

const ButlerCategoryGrid = ({ onCategorySelect }: ButlerCategoryGridProps) => {
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const handleCardClick = (id: ServiceId) => {
        const service = services.find((s) => s.id === id);
        if (service) {
            setSelectedService(service);
            setModalOpen(true);
        }
        onCategorySelect?.(id);
    };

    return (
        <section id="butler-categories" className="section-padding bg-charcoal text-primary-foreground">
            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-12 md:mb-16">
                    <p className="text-brass font-medium uppercase tracking-widest text-sm mb-3">
                        Our Services
                    </p>
                    <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-medium mb-4">
                        Choose Your Butler
                    </h2>
                    <p className="text-primary-foreground/70 text-lg max-w-xl mx-auto">
                        Six specialist services. Select what you need.
                    </p>
                </div>

                {/* 2×3 Glass-morphism Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {services.map((service) => (
                        <button
                            key={service.id}
                            onClick={() => handleCardClick(service.id)}
                            className="group text-left p-8 rounded-2xl bg-primary-foreground/5 border border-primary-foreground/10 backdrop-blur transition-all duration-300 hover:bg-primary-foreground/10 hover:border-primary-foreground/20 hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-brass/40 focus:ring-offset-2 focus:ring-offset-charcoal active:scale-[0.98]"
                        >
                            {/* Category Name */}
                            <h3 className="font-serif text-xl md:text-2xl font-medium mb-2">
                                {service.name}
                            </h3>

                            {/* Tagline */}
                            <p className="text-brass font-medium text-xs uppercase tracking-wider mb-3">
                                {service.subtitle}
                            </p>

                            {/* One-liner Description */}
                            <p className="text-primary-foreground/60 text-sm leading-relaxed">
                                {service.examples[0]}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Service Modal */}
            <ServiceModal
                service={selectedService}
                open={modalOpen}
                onOpenChange={setModalOpen}
            />
        </section>
    );
};

export default ButlerCategoryGrid;
