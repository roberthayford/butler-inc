"use client";

import { useEffect } from "react";
import { motion } from "motion/react";

export default function Template({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
            }}
        >
            {children}
        </motion.div>
    );
}
