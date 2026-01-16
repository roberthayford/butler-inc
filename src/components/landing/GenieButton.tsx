import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { useState } from "react";

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
                🧞 Genie in a Butler
            </Button>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-serif text-xl flex items-center gap-2">
                            <span className="text-2xl">🧞</span> Summon the Genie
                        </DialogTitle>
                        <DialogDescription className="text-base leading-relaxed">
                            For those crazy outlandish requests that only a genie can fulfil
                            <span className="text-muted-foreground/70"> (*within reason 😉)</span>,
                            or when you desperately need something and none of the time slots work for you.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-6">
                        <div className="p-4 rounded-lg bg-red-50 border border-red-100">
                            <p className="text-sm text-red-800 font-medium mb-1">
                                💡 Think of it as the button to stop you from:
                            </p>
                            <ul className="text-sm text-red-700 space-y-1 ml-4">
                                <li>• Getting fired</li>
                                <li>• Your partner being mad you forgot your anniversary</li>
                                <li>• Missing that critical deadline</li>
                            </ul>
                        </div>

                        <div className="p-4 rounded-lg bg-gold/10 border border-gold/20">
                            <p className="text-sm font-medium text-foreground mb-2">
                                Genie Button Allowance
                            </p>
                            <div className="grid grid-cols-3 gap-3 text-center text-sm">
                                <div>
                                    <p className="text-muted-foreground">Light</p>
                                    <p className="font-medium">1/year</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Standard</p>
                                    <p className="font-medium">3/year</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Premium</p>
                                    <p className="font-medium">6/year</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button
                                className="w-full bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => setDialogOpen(false)}
                            >
                                Summon Now (Members Only)
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setDialogOpen(false)}
                            >
                                Become a Member
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default GenieButton;
