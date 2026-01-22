import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { useState } from "react";
import { membershipTiers } from "@/data/membership-tiers";

interface GenieButtonProps {
    variant?: "floating" | "inline";
    className?: string;
}

const GenieButton = ({ variant = "inline", className = "" }: GenieButtonProps) => {
    const [dialogOpen, setDialogOpen] = useState(false);

    const buttonClasses = variant === "floating"
        ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25 animate-pulse-subtle"
        : "bg-red-600 hover:bg-red-700 text-white";

    return (
        <>
            <Button
                onClick={() => setDialogOpen(true)}
                className={`${buttonClasses} ${className}`}
            >
                Summon the Genie
            </Button>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-serif text-xl flex items-center gap-2">
                            <span className="text-2xl">🧞</span> The Genie
                        </DialogTitle>
                        <DialogDescription className="text-base leading-relaxed">
                            For the impossible request. The missed deadline. The moment when ordinary service won't do.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-6">
                        <div className="p-4 rounded-lg bg-brass/10 border border-brass/20">
                            <p className="text-sm font-medium text-foreground mb-3">
                                Genie Allowance by Tier
                            </p>
                            <div className="grid grid-cols-3 gap-3 text-center text-sm">
                                {membershipTiers.map((tier) => (
                                    <div key={tier.name}>
                                        <p className="text-muted-foreground">{tier.name}</p>
                                        <p className="font-medium">{tier.genieAllowance}</p>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground text-center mt-3">Use it wisely.</p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button
                                className="w-full bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => setDialogOpen(false)}
                            >
                                Summon
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setDialogOpen(false)}
                            >
                                Join
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default GenieButton;
