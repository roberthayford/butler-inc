"use client";

import { useState } from "react";
import { AdminEditor } from "./AdminEditor";
import { MemberManager } from "./MemberManager";

const TABS = [
  { id: "members", label: "Members" },
  { id: "content", label: "Content" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("members");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-primary-foreground/10 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-brass text-optical-white"
                : "border-transparent text-warm-gray hover:text-optical-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "members" && <MemberManager />}
      {activeTab === "content" && <AdminEditor />}
    </div>
  );
}
