"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/membership/TierBadge";
import { toast } from "sonner";
import type { TierSlug } from "@/types/membership";

interface MembershipTierInfo {
  slug: string;
  name: string;
}

interface MembershipInfo {
  id: string;
  tier_id: string;
  personal_hours_total: number;
  personal_hours_used: number;
  virtual_tasks_total: number;
  virtual_tasks_used: number;
  billing_period_start: string;
  billing_period_end: string;
  status: string;
  membership_tiers: MembershipTierInfo;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  membership: MembershipInfo | null;
}

interface EditFormData {
  tierSlug: TierSlug;
  personalHoursTotal: number;
  personalHoursUsed: number;
  virtualTasksTotal: number;
  virtualTasksUsed: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  status: string;
}

const TIER_DEFAULTS: Record<TierSlug, { hours: number; tasks: number }> = {
  lite: { hours: 5, tasks: 3 },
  essential: { hours: 15, tasks: 8 },
  heavy: { hours: 30, tasks: 15 },
};

function getDefaultBillingPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

export function MemberManager() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EditFormData | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/members");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setUsers(data);
    } catch {
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const startEdit = (user: AdminUser) => {
    const billing = getDefaultBillingPeriod();
    if (user.membership) {
      setFormData({
        tierSlug: user.membership.membership_tiers.slug as TierSlug,
        personalHoursTotal: user.membership.personal_hours_total,
        personalHoursUsed: user.membership.personal_hours_used,
        virtualTasksTotal: user.membership.virtual_tasks_total,
        virtualTasksUsed: user.membership.virtual_tasks_used,
        billingPeriodStart: user.membership.billing_period_start,
        billingPeriodEnd: user.membership.billing_period_end,
        status: user.membership.status,
      });
    } else {
      setFormData({
        tierSlug: "essential",
        personalHoursTotal: TIER_DEFAULTS.essential.hours,
        personalHoursUsed: 0,
        virtualTasksTotal: TIER_DEFAULTS.essential.tasks,
        virtualTasksUsed: 0,
        billingPeriodStart: billing.start,
        billingPeriodEnd: billing.end,
        status: "active",
      });
    }
    setEditingUserId(user.id);
  };

  const handleTierChange = (slug: TierSlug) => {
    if (!formData) return;
    const defaults = TIER_DEFAULTS[slug];
    setFormData({
      ...formData,
      tierSlug: slug,
      personalHoursTotal: defaults.hours,
      virtualTasksTotal: defaults.tasks,
    });
  };

  const handleSave = async () => {
    if (!editingUserId || !formData) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/members/${editingUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }

      toast.success("Membership updated");
      setEditingUserId(null);
      setFormData(null);
      setLoading(true);
      fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-primary-foreground/5 rounded-sm animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <div key={user.id} className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm">
          {/* User row */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-optical-white font-medium">{user.name || "Unnamed"}</p>
                <p className="text-warm-gray text-sm">{user.email}</p>
              </div>
              {user.membership ? (
                <TierBadge tier={user.membership.membership_tiers.slug as TierSlug} />
              ) : (
                <span className="text-xs text-warm-gray/60 px-2 py-0.5 border border-primary-foreground/10 rounded-sm">
                  No membership
                </span>
              )}
            </div>
            <div>
              {user.membership ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editingUserId === user.id ? (setEditingUserId(null), setFormData(null)) : startEdit(user)}
                  className="border-primary-foreground/20 text-optical-white hover:bg-primary-foreground/10"
                >
                  {editingUserId === user.id ? "Cancel" : "Edit"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => startEdit(user)}
                  className="bg-brass text-charcoal hover:bg-brass-muted"
                >
                  Create Membership
                </Button>
              )}
            </div>
          </div>

          {/* Edit form (expanded) */}
          {editingUserId === user.id && formData && (
            <div className="px-4 pb-4 pt-2 border-t border-primary-foreground/10 space-y-4">
              {/* Tier selector */}
              <div>
                <label className="block text-sm font-medium text-optical-white mb-1">Tier</label>
                <div className="flex gap-2">
                  {(["lite", "essential", "heavy"] as TierSlug[]).map((slug) => (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => handleTierChange(slug)}
                      className={`px-3 py-1.5 rounded-sm border text-sm transition-colors ${
                        formData.tierSlug === slug
                          ? "border-brass/60 bg-brass/10 text-optical-white"
                          : "border-primary-foreground/10 text-warm-gray hover:border-primary-foreground/20"
                      }`}
                    >
                      {slug.charAt(0).toUpperCase() + slug.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`hours-total-${user.id}`} className="block text-sm font-medium text-optical-white mb-1">
                    Hours Total
                  </label>
                  <input
                    id={`hours-total-${user.id}`}
                    type="number"
                    min={0}
                    value={formData.personalHoursTotal}
                    onChange={(e) => setFormData({ ...formData, personalHoursTotal: Number(e.target.value) })}
                    className="w-full bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-2 text-optical-white focus:border-brass/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor={`hours-used-${user.id}`} className="block text-sm font-medium text-optical-white mb-1">
                    Hours Used
                  </label>
                  <input
                    id={`hours-used-${user.id}`}
                    type="number"
                    min={0}
                    value={formData.personalHoursUsed}
                    onChange={(e) => setFormData({ ...formData, personalHoursUsed: Number(e.target.value) })}
                    className="w-full bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-2 text-optical-white focus:border-brass/40 focus:outline-none"
                  />
                </div>
              </div>

              {/* Tasks */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`tasks-total-${user.id}`} className="block text-sm font-medium text-optical-white mb-1">
                    Tasks Total
                  </label>
                  <input
                    id={`tasks-total-${user.id}`}
                    type="number"
                    min={0}
                    value={formData.virtualTasksTotal}
                    onChange={(e) => setFormData({ ...formData, virtualTasksTotal: Number(e.target.value) })}
                    className="w-full bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-2 text-optical-white focus:border-brass/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor={`tasks-used-${user.id}`} className="block text-sm font-medium text-optical-white mb-1">
                    Tasks Used
                  </label>
                  <input
                    id={`tasks-used-${user.id}`}
                    type="number"
                    min={0}
                    value={formData.virtualTasksUsed}
                    onChange={(e) => setFormData({ ...formData, virtualTasksUsed: Number(e.target.value) })}
                    className="w-full bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-2 text-optical-white focus:border-brass/40 focus:outline-none"
                  />
                </div>
              </div>

              {/* Billing period */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`billing-start-${user.id}`} className="block text-sm font-medium text-optical-white mb-1">
                    Period Start
                  </label>
                  <input
                    id={`billing-start-${user.id}`}
                    type="date"
                    value={formData.billingPeriodStart}
                    onChange={(e) => setFormData({ ...formData, billingPeriodStart: e.target.value })}
                    className="w-full bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-2 text-optical-white focus:border-brass/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor={`billing-end-${user.id}`} className="block text-sm font-medium text-optical-white mb-1">
                    Period End
                  </label>
                  <input
                    id={`billing-end-${user.id}`}
                    type="date"
                    value={formData.billingPeriodEnd}
                    onChange={(e) => setFormData({ ...formData, billingPeriodEnd: e.target.value })}
                    className="w-full bg-primary-foreground/5 border border-primary-foreground/10 rounded-sm p-2 text-optical-white focus:border-brass/40 focus:outline-none"
                  />
                </div>
              </div>

              {/* Status */}
              {user.membership && (
                <div>
                  <label className="block text-sm font-medium text-optical-white mb-1">Status</label>
                  <div className="flex gap-2">
                    {["active", "paused", "cancelled"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: s })}
                        className={`px-3 py-1.5 rounded-sm border text-sm transition-colors ${
                          formData.status === s
                            ? "border-brass/60 bg-brass/10 text-optical-white"
                            : "border-primary-foreground/10 text-warm-gray hover:border-primary-foreground/20"
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Save */}
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-brass text-charcoal hover:bg-brass-muted disabled:opacity-50"
              >
                {saving ? "Saving..." : user.membership ? "Save Changes" : "Create Membership"}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
