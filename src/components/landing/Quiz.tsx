import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

type QuizStep = "urgency" | "task" | "priority" | "result";

interface QuizResult {
    butler: string;
    name: string;
    description: string;
    payg: string;
    membership: string;
}

const butlerResults: Record<string, QuizResult> = {
    busy: {
        butler: "busy",
        name: "Busy Butler",
        description: "Perfect for urgent, same-day tasks requiring professional logistics.",
        payg: "From £45/hr",
        membership: "From £38/hr with membership",
    },
    baby: {
        butler: "baby",
        name: "Baby Butler",
        description: "Specialist in school runs and child logistics with optional body-cam.",
        payg: "From £50/hr",
        membership: "From £42/hr with membership",
    },
    bougie: {
        butler: "bougie",
        name: "Bougie Butler",
        description: "For luxury sourcing, VIP reservations, and premium experiences.",
        payg: "From £80/hr",
        membership: "From £64/hr with membership",
    },
    base: {
        butler: "base",
        name: "Base Butler",
        description: "Home waiting, property checks, and tradesman coordination.",
        payg: "From £35/hr",
        membership: "From £30/hr with membership",
    },
    budget: {
        butler: "budget",
        name: "Budget Butler",
        description: "Best rates with flexible timing for non-urgent tasks.",
        payg: "From £20/hr",
        membership: "From £17/hr with membership",
    },
    bespoke: {
        butler: "bespoke",
        name: "Bespoke Butler",
        description: "Custom solutions for unique or complex requests.",
        payg: "Quote-based",
        membership: "Priority quoting for members",
    },
};

interface QuizProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectService?: (serviceId: string) => void;
}

const Quiz = ({ open, onOpenChange, onSelectService }: QuizProps) => {
    const [step, setStep] = useState<QuizStep>("urgency");
    const [urgency, setUrgency] = useState<string | null>(null);
    const [taskType, setTaskType] = useState<string | null>(null);
    const [priority, setPriority] = useState<string | null>(null);
    const [result, setResult] = useState<QuizResult | null>(null);

    const resetQuiz = () => {
        setStep("urgency");
        setUrgency(null);
        setTaskType(null);
        setPriority(null);
        setResult(null);
    };

    const handleClose = (isOpen: boolean) => {
        if (!isOpen) {
            resetQuiz();
        }
        onOpenChange(isOpen);
    };

    const calculateResult = (u: string, t: string, p: string): QuizResult => {
        // Task type takes priority
        if (t === "childcare") return butlerResults.baby;
        if (t === "luxury") return butlerResults.bougie;
        if (t === "property") return butlerResults.base;
        if (t === "custom") return butlerResults.bespoke;

        // For deliveries/errands, use urgency and priority
        if (u === "today" || p === "speed") return butlerResults.busy;
        if (p === "value") return butlerResults.budget;

        // Default to budget for flexible timing
        return butlerResults.budget;
    };

    const handleUrgencySelect = (value: string) => {
        setUrgency(value);
        setStep("task");
    };

    const handleTaskSelect = (value: string) => {
        setTaskType(value);
        setStep("priority");
    };

    const handlePrioritySelect = (value: string) => {
        setPriority(value);
        const calculatedResult = calculateResult(urgency!, taskType!, value);
        setResult(calculatedResult);
        setStep("result");
    };

    const handleBookService = () => {
        if (result && onSelectService) {
            onSelectService(result.butler);
        }
        handleClose(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-serif text-xl">
                        {step === "result" ? "We recommend..." : "Find your perfect butler"}
                    </DialogTitle>
                    {step !== "result" && (
                        <DialogDescription>
                            Answer a few quick questions and we'll match you with the right service.
                        </DialogDescription>
                    )}
                </DialogHeader>

                <div className="py-4">
                    {/* Step 1: Urgency */}
                    {step === "urgency" && (
                        <div className="space-y-3">
                            <p className="text-sm font-medium text-muted-foreground mb-4">
                                When do you need this done?
                            </p>
                            <button
                                onClick={() => handleUrgencySelect("today")}
                                className="w-full p-4 text-left rounded-lg border border-border hover:border-brass/50 hover:bg-accent/50 transition-all"
                            >
                                <span className="font-medium">Today / ASAP</span>
                                <span className="block text-sm text-muted-foreground">I need urgent help</span>
                            </button>
                            <button
                                onClick={() => handleUrgencySelect("week")}
                                className="w-full p-4 text-left rounded-lg border border-border hover:border-brass/50 hover:bg-accent/50 transition-all"
                            >
                                <span className="font-medium">This week</span>
                                <span className="block text-sm text-muted-foreground">I can wait a day or two</span>
                            </button>
                            <button
                                onClick={() => handleUrgencySelect("flexible")}
                                className="w-full p-4 text-left rounded-lg border border-border hover:border-brass/50 hover:bg-accent/50 transition-all"
                            >
                                <span className="font-medium">Flexible timing</span>
                                <span className="block text-sm text-muted-foreground">Whenever works best</span>
                            </button>
                        </div>
                    )}

                    {/* Step 2: Task Type */}
                    {step === "task" && (
                        <div className="space-y-3">
                            <p className="text-sm font-medium text-muted-foreground mb-4">
                                What kind of help do you need?
                            </p>
                            <button
                                onClick={() => handleTaskSelect("errands")}
                                className="w-full p-4 text-left rounded-lg border border-border hover:border-brass/50 hover:bg-accent/50 transition-all"
                            >
                                <span className="font-medium">Deliveries or errands</span>
                            </button>
                            <button
                                onClick={() => handleTaskSelect("childcare")}
                                className="w-full p-4 text-left rounded-lg border border-border hover:border-brass/50 hover:bg-accent/50 transition-all"
                            >
                                <span className="font-medium">Childcare logistics</span>
                            </button>
                            <button
                                onClick={() => handleTaskSelect("property")}
                                className="w-full p-4 text-left rounded-lg border border-border hover:border-brass/50 hover:bg-accent/50 transition-all"
                            >
                                <span className="font-medium">Property / home tasks</span>
                            </button>
                            <button
                                onClick={() => handleTaskSelect("luxury")}
                                className="w-full p-4 text-left rounded-lg border border-border hover:border-brass/50 hover:bg-accent/50 transition-all"
                            >
                                <span className="font-medium">Luxury sourcing</span>
                            </button>
                            <button
                                onClick={() => handleTaskSelect("custom")}
                                className="w-full p-4 text-left rounded-lg border border-border hover:border-brass/50 hover:bg-accent/50 transition-all"
                            >
                                <span className="font-medium">Something else</span>
                            </button>
                        </div>
                    )}

                    {/* Step 3: Priority */}
                    {step === "priority" && (
                        <div className="space-y-3">
                            <p className="text-sm font-medium text-muted-foreground mb-4">
                                What matters most to you?
                            </p>
                            <button
                                onClick={() => handlePrioritySelect("speed")}
                                className="w-full p-4 text-left rounded-lg border border-border hover:border-brass/50 hover:bg-accent/50 transition-all"
                            >
                                <span className="font-medium">Speed</span>
                                <span className="block text-sm text-muted-foreground">Get it done fast</span>
                            </button>
                            <button
                                onClick={() => handlePrioritySelect("value")}
                                className="w-full p-4 text-left rounded-lg border border-border hover:border-brass/50 hover:bg-accent/50 transition-all"
                            >
                                <span className="font-medium">Value</span>
                                <span className="block text-sm text-muted-foreground">Best price possible</span>
                            </button>
                            <button
                                onClick={() => handlePrioritySelect("quality")}
                                className="w-full p-4 text-left rounded-lg border border-border hover:border-brass/50 hover:bg-accent/50 transition-all"
                            >
                                <span className="font-medium">Premium experience</span>
                                <span className="block text-sm text-muted-foreground">Quality over everything</span>
                            </button>
                        </div>
                    )}

                    {/* Result */}
                    {step === "result" && result && (
                        <div className="space-y-6">
                            <div className="p-6 rounded-xl bg-ivory text-center">
                                <h3 className="font-serif text-2xl font-medium text-brass mb-2">
                                    {result.name}
                                </h3>
                                <p className="text-muted-foreground mb-4">{result.description}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="p-4 rounded-lg bg-secondary/50">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Pay As You Go</p>
                                    <p className="font-medium">{result.payg}</p>
                                </div>
                                <div className="p-4 rounded-lg bg-brass/10 border border-brass/20">
                                    <p className="text-xs text-brass uppercase tracking-wider mb-1">With Membership</p>
                                    <p className="font-medium">{result.membership}</p>
                                </div>
                            </div>

                            <div className="p-4 rounded-lg bg-sage-light/50 border border-sage/20">
                                <p className="text-sm text-sage font-medium mb-1">💡 Membership benefits</p>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                    <li>• Priority slots & dedicated helpline</li>
                                    <li>• Free virtual butler credits each month</li>
                                    <li>• Up to 20% off hourly rates</li>
                                </ul>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={resetQuiz}
                                >
                                    Start over
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={handleBookService}
                                >
                                    Book {result.name.split(" ")[0]}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default Quiz;
