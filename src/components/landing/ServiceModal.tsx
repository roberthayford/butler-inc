import * as React from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerClose,
} from "@/components/ui/drawer";
import { type Service } from "@/data/services";
import { useMediaQuery } from "@/hooks/use-media-query";

interface ServiceModalProps {
    service: Service | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ServiceModalContent = ({ service }: { service: Service }) => {
    return (
        <div className="animate-fade-in">
            {/* Image */}
            <div className="aspect-[16/9] md:aspect-[4/3] w-full rounded-xl overflow-hidden mb-4">
                <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Tags */}
            <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    {service.type}
                </span>
                {service.bodycam && (
                    <>
                        <span className="text-border">·</span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sage">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Body-cam enabled
                        </span>
                    </>
                )}
            </div>

            {/* Examples */}
            <div className="mb-6">
                <p className="text-sm font-medium text-muted-foreground mb-3">Example requests:</p>
                <ul className="space-y-2.5">
                    {service.examples.map((example, idx) => (
                        <li
                            key={idx}
                            className="text-sm text-foreground flex items-start gap-2.5"
                        >
                            <span className="text-brass mt-0.5 flex-shrink-0">–</span>
                            {example}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const ServiceModal = ({ service, open, onOpenChange }: ServiceModalProps) => {
    const isDesktop = useMediaQuery("(min-width: 768px)");

    if (!service) return null;

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent
                    className="sm:max-w-[520px] p-6 rounded-2xl bg-ivory border-0 shadow-2xl"
                >
                    <DialogHeader className="space-y-1 mb-2">
                        <DialogTitle className="font-serif text-2xl font-medium">
                            {service.name}
                        </DialogTitle>
                        <DialogDescription className="text-brass font-medium">
                            {service.subtitle}
                        </DialogDescription>
                    </DialogHeader>

                    <ServiceModalContent service={service} />

                    <div className="flex items-center justify-between pt-2">
                        <p className="text-sm">
                            <span className="text-brass font-semibold text-base">From {service.priceFrom}</span>
                            {service.priceFrom !== "Quote" && <span className="text-muted-foreground"> per hour</span>}
                        </p>
                        <Button className="min-w-[160px]">
                            Reserve this Butler
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="px-4 pb-8 bg-ivory max-h-[90vh] border-0">
                <DrawerHeader className="text-left pt-4 px-0">
                    <DrawerTitle className="font-serif text-xl font-medium">
                        {service.name}
                    </DrawerTitle>
                    <DrawerDescription className="text-brass font-medium">
                        {service.subtitle}
                    </DrawerDescription>
                </DrawerHeader>

                <div className="overflow-y-auto flex-1">
                    <ServiceModalContent service={service} />
                </div>

                <DrawerFooter className="px-0 pt-4 gap-3">
                    <Button className="w-full h-12 text-base">
                        Reserve this Butler
                    </Button>
                    <DrawerClose asChild>
                        <Button variant="outline" className="w-full">
                            Close
                        </Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
};

export default ServiceModal;
