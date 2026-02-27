"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function Hero() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"non-members" | "members">(
    "non-members"
  );

  const handleTabClick = (tab: "non-members" | "members") => {
    setActiveTab(tab);
    if (tab === "members") {
      router.push("/members/login");
    } else {
      const el = document.getElementById("butler-categories");
      el?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Dark overlay */}
      <div className="absolute inset-0 hero-overlay z-10" />
      <div className="absolute inset-0 bg-charcoal" />

      <div className="relative z-20 text-center px-6 max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-optical-white text-shadow-crisp leading-tight">
          Your personal butler, on demand.
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-optical-white/80 text-shadow-crisp">
          Across England. From £35/hr.
        </p>

        {/* Segmented control */}
        <div className="mt-10 inline-flex rounded-full hero-segmented-control p-1">
          <button
            onClick={() => handleTabClick("non-members")}
            className={`
              px-6 py-3 rounded-full text-sm font-medium transition-all duration-300
              ${
                activeTab === "non-members"
                  ? "bg-optical-white text-charcoal"
                  : "text-optical-white/70 hover:text-optical-white"
              }
            `}
          >
            Non-Members
          </button>
          <button
            onClick={() => handleTabClick("members")}
            className={`
              px-6 py-3 rounded-full text-sm font-medium transition-all duration-300
              ${
                activeTab === "members"
                  ? "bg-optical-white text-charcoal"
                  : "text-optical-white/70 hover:text-optical-white"
              }
            `}
          >
            Members
          </button>
        </div>
      </div>
    </section>
  );
}
