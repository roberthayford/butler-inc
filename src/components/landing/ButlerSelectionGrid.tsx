import { useState } from "react";
import { services, type ServiceId, type Service } from "@/data/services";
import ServiceModal from "./ServiceModal";

interface ButlerSelectionGridProps {
    onButlerSelect?: (serviceId: ServiceId) => void;
}

const ButlerSelectionGrid = ({ onButlerSelect }: ButlerSelectionGridProps) => {
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const handleCardClick = (id: ServiceId) => {
        // Find the service and open the modal
        const service = services.find(s => s.id === id);
        if (service) {
            setSelectedService(service);
            setModalOpen(true);
        }

        // Call parent handler
        onButlerSelect?.(id);
    };

    return (
        <section
            id="butler-selection"
            className="section-padding bg-ivory"
        >
            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-12">
                    <p className="text-brass font-medium uppercase tracking-widest text-sm mb-3">
                        Pay As You Go
                    </p>
                    <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-medium text-foreground mb-4">
                        Choose Your Butler
                    </h2>
                    <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                        Six specialist services. Select the one that fits your need.
                    </p>
                </div>

                {/* 6-Box Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                    {services.map((service) => (
                        <button
                            key={service.id}
                            onClick={() => handleCardClick(service.id)}
                            className="group relative bg-background rounded-2xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.08)] hover:shadow-2xl transition-all duration-500 ease-out border border-transparent hover:border-brass/20 focus:outline-none focus:ring-2 focus:ring-brass/30 focus:ring-offset-2 active:scale-[0.98] text-left"
                        >
                            {/* Image Container */}
                            <div className="aspect-[4/3] relative overflow-hidden">
                                <img
                                    src={service.image}
                                    alt={service.name}
                                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                />
                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />

                                {/* Price Badge */}
                                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-background/90 backdrop-blur-sm text-xs font-medium text-foreground shadow-sm">
                                    From {service.priceFrom}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-4 md:p-5">
                                <h3 className="font-serif text-lg md:text-xl font-medium text-foreground mb-1 group-hover:text-brass transition-colors duration-300">
                                    {service.name}
                                </h3>
                                <p className="text-xs md:text-sm text-brass font-medium uppercase tracking-wider mb-2">
                                    {service.subtitle}
                                </p>

                                {/* Bodycam Badge */}
                                {service.bodycam && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-sage-light text-sage">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        Body-cam
                                    </span>
                                )}
                            </div>

                            {/* Hover Arrow Indicator */}
                            <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-brass/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                                <svg className="w-4 h-4 text-brass" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
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

export default ButlerSelectionGrid;
