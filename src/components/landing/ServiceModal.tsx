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
import { motion, AnimatePresence } from "framer-motion";

interface ServiceModalProps {
    service: Service | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// Spring-based animation configs (Apple-style)
const springTransition = {
    type: "spring",
    damping: 25,
    stiffness: 300,
};

const fadeUpVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (delay: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            ...springTransition,
            delay: delay * 0.08,
        },
    }),
    exit: { opacity: 0, y: 10, transition: { duration: 0.15 } },
};

const scaleVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: springTransition,
    },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2 } },
};

const ServiceModalContent = ({ service, isVisible }: { service: Service; isVisible: boolean }) => {
    return (
        <AnimatePresence mode="wait">
            {isVisible && (
                <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="overflow-hidden"
                >
                    {/* Image with Ken Burns effect */}
                    <motion.div
                        variants={fadeUpVariants}
                        custom={0}
                        className="aspect-[16/9] md:aspect-[4/3] w-full rounded-xl overflow-hidden relative mb-4 group"
                    >
                        <motion.img
                            src={service.image}
                            alt={service.name}
                            className="w-full h-full object-cover"
                            initial={{ scale: 1 }}
                            animate={{
                                scale: 1.08,
                            }}
                            transition={{
                                duration: 12,
                                ease: "linear",
                                repeat: Infinity,
                                repeatType: "reverse",
                            }}
                        />
                        {/* Subtle vignette overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

                        {/* Price Badge with entrance animation */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, x: 10 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            transition={{ ...springTransition, delay: 0.2 }}
                            className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-background/95 backdrop-blur-md text-sm font-medium text-foreground shadow-lg border border-white/20"
                        >
                            From {service.priceFrom}
                        </motion.div>
                    </motion.div>

                    {/* Tags */}
                    <motion.div
                        variants={fadeUpVariants}
                        custom={1}
                        className="flex items-center gap-2 mb-3"
                    >
                        <span className="text-xs font-medium uppercase tracking-wider px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
                            {service.type}
                        </span>
                        {service.bodycam && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-sage-light text-sage">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Body-cam enabled
                            </span>
                        )}
                    </motion.div>

                    {/* Examples with staggered reveal */}
                    <motion.div variants={fadeUpVariants} custom={2} className="mb-6">
                        <p className="text-sm font-medium text-muted-foreground mb-3">Example requests:</p>
                        <ul className="space-y-2.5">
                            {service.examples.map((example, idx) => (
                                <motion.li
                                    key={idx}
                                    variants={fadeUpVariants}
                                    custom={3 + idx}
                                    className="text-sm text-foreground flex items-start gap-2.5"
                                >
                                    <span className="text-brass mt-0.5 flex-shrink-0">–</span>
                                    {example}
                                </motion.li>
                            ))}
                        </ul>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Premium button with micro-interactions
const ReserveButton = ({ className = "" }: { className?: string }) => (
    <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={springTransition}
    >
        <Button
            className={`relative overflow-hidden group ${className}`}
            style={{
                boxShadow: "0 4px 14px 0 rgba(0,0,0,0.1)",
            }}
        >
            <span className="relative z-10">Reserve this Butler</span>
            {/* Hover glow effect */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-brass/20 to-brass/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
        </Button>
    </motion.div>
);

const ServiceModal = ({ service, open, onOpenChange }: ServiceModalProps) => {
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const [contentVisible, setContentVisible] = React.useState(false);

    // Trigger content animation after modal opens
    React.useEffect(() => {
        if (open) {
            const timer = setTimeout(() => setContentVisible(true), 50);
            return () => clearTimeout(timer);
        } else {
            setContentVisible(false);
        }
    }, [open]);

    if (!service) return null;

    // Desktop: Centered Modal with enhanced animations
    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent
                    className="sm:max-w-[520px] p-6 rounded-2xl bg-ivory border-0 shadow-2xl overflow-hidden"
                    style={{
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.1)",
                    }}
                >
                    <motion.div
                        variants={scaleVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <DialogHeader className="space-y-1 mb-2">
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ ...springTransition, delay: 0.1 }}
                            >
                                <DialogTitle className="font-serif text-2xl font-medium">
                                    {service.name}
                                </DialogTitle>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.15, duration: 0.3 }}
                            >
                                <DialogDescription className="text-brass font-medium">
                                    {service.subtitle}
                                </DialogDescription>
                            </motion.div>
                        </DialogHeader>

                        <ServiceModalContent service={service} isVisible={contentVisible} />

                        <motion.div
                            variants={fadeUpVariants}
                            custom={7}
                            initial="hidden"
                            animate={contentVisible ? "visible" : "hidden"}
                            className="flex items-center justify-between pt-2"
                        >
                            <span className="text-sm text-muted-foreground">
                                From {service.priceFrom}
                                {service.priceFrom !== "Quote" && " per hour"}
                            </span>
                            <ReserveButton className="min-w-[160px]" />
                        </motion.div>
                    </motion.div>
                </DialogContent>
            </Dialog>
        );
    }

    // Mobile: Bottom Sheet Drawer with smooth animations
    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="px-4 pb-8 bg-ivory max-h-[90vh] border-0">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={springTransition}
                >
                    <DrawerHeader className="text-left pt-4 px-0">
                        <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ ...springTransition, delay: 0.1 }}
                        >
                            <DrawerTitle className="font-serif text-xl font-medium">
                                {service.name}
                            </DrawerTitle>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.15 }}
                        >
                            <DrawerDescription className="text-brass font-medium">
                                {service.subtitle}
                            </DrawerDescription>
                        </motion.div>
                    </DrawerHeader>

                    <div className="overflow-y-auto flex-1">
                        <ServiceModalContent service={service} isVisible={contentVisible} />
                    </div>

                    <DrawerFooter className="px-0 pt-4 gap-3">
                        <motion.div
                            variants={fadeUpVariants}
                            custom={6}
                            initial="hidden"
                            animate={contentVisible ? "visible" : "hidden"}
                        >
                            <ReserveButton className="w-full h-12 text-base" />
                        </motion.div>
                        <motion.div
                            variants={fadeUpVariants}
                            custom={7}
                            initial="hidden"
                            animate={contentVisible ? "visible" : "hidden"}
                        >
                            <DrawerClose asChild>
                                <Button variant="outline" className="w-full">
                                    Close
                                </Button>
                            </DrawerClose>
                        </motion.div>
                    </DrawerFooter>
                </motion.div>
            </DrawerContent>
        </Drawer>
    );
};

export default ServiceModal;
