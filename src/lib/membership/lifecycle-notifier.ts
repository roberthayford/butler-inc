// src/lib/membership/lifecycle-notifier.ts
import { Resend } from "resend";
import { render } from "@react-email/components";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Transition } from "./lifecycle-transitions";
import { resolveAdminRecipient } from "./admin-recipient";
import { MEMBERSHIP_TIERS } from "@/data/membership-config";

import { WelcomeEmail } from "@/emails/membership/WelcomeEmail";
import { RenewalReceiptEmail } from "@/emails/membership/RenewalReceiptEmail";
import { PaymentFailedEmail } from "@/emails/membership/PaymentFailedEmail";
import { PauseConfirmedEmail } from "@/emails/membership/PauseConfirmedEmail";
import { ResumeConfirmedEmail } from "@/emails/membership/ResumeConfirmedEmail";
import { CancellationScheduledEmail } from "@/emails/membership/CancellationScheduledEmail";
import { CancellationFinalEmail } from "@/emails/membership/CancellationFinalEmail";
import { PlanChangedEmail } from "@/emails/membership/PlanChangedEmail";

import { NewMemberNotification } from "@/emails/membership/admin/NewMemberNotification";
import { PaymentFailedNotification } from "@/emails/membership/admin/PaymentFailedNotification";
import { PauseNotification } from "@/emails/membership/admin/PauseNotification";
import { CancelScheduledNotification } from "@/emails/membership/admin/CancelScheduledNotification";
import { CancellationFinalNotification } from "@/emails/membership/admin/CancellationFinalNotification";

const FROM = "Butlers Inc <memberships@butlersinc.com>";
const REPLY_TO = "hello@butlersinc.com";

export interface NotifyArgs {
  eventId: string;
  transition: Transition;
  recipient: { email: string; name: string };
  subscriptionId: string;
}

interface RenderedEmail { subject: string; html: string; text: string; }
type RenderFn = () => Promise<RenderedEmail>;

function tierName(slug: string): string {
  return MEMBERSHIP_TIERS.find((t) => t.slug === slug)?.name ?? slug;
}

function tierPrice(slug: string): number {
  return MEMBERSHIP_TIERS.find((t) => t.slug === slug)?.monthlyPrice ?? 0;
}

function formatUk(iso: string): string {
  if (!iso) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

async function renderEmail(subject: string, node: React.ReactElement): Promise<RenderedEmail> {
  const [html, text] = await Promise.all([
    render(node),
    render(node, { plainText: true }),
  ]);
  return { subject, html, text };
}

function memberRenderer(t: Transition, name: string): RenderFn | null {
  switch (t.kind) {
    case "activated":
      return () => renderEmail(`Welcome to Butlers Inc ${tierName(t.tierSlug)}`,
        WelcomeEmail({ name, tierName: tierName(t.tierSlug), hoursTotal: t.hoursTotal, tasksTotal: t.tasksTotal, renewsAt: formatUk(t.renewsAt), monthlyPrice: t.monthlyPrice }));
    case "renewed":
      return () => renderEmail(`Your Butlers Inc ${tierName(t.tierSlug)} has renewed`,
        RenewalReceiptEmail({
          name, tierName: tierName(t.tierSlug), monthlyPrice: t.monthlyPrice,
          hoursTotal: MEMBERSHIP_TIERS.find((m) => m.slug === t.tierSlug)?.personalHoursIncluded ?? 0,
          tasksTotal: MEMBERSHIP_TIERS.find((m) => m.slug === t.tierSlug)?.virtualTasksIncluded ?? 0,
          periodEnd: formatUk(t.periodEnd),
        }));
    case "payment_failed":
      return () => renderEmail(`Action needed: payment failed for your Butlers Inc ${tierName(t.tierSlug)}`,
        PaymentFailedEmail({ name, tierName: tierName(t.tierSlug) }));
    case "paused":
      return () => renderEmail(`Your Butlers Inc ${tierName(t.tierSlug)} is paused`,
        PauseConfirmedEmail({ name, tierName: tierName(t.tierSlug) }));
    case "resumed":
      return () => renderEmail(`Welcome back to your Butlers Inc ${tierName(t.tierSlug)}`,
        ResumeConfirmedEmail({ name, tierName: tierName(t.tierSlug) }));
    case "cancel_scheduled":
      return () => renderEmail(`Your Butlers Inc ${tierName(t.tierSlug)} cancels on ${formatUk(t.endsAt)}`,
        CancellationScheduledEmail({ name, tierName: tierName(t.tierSlug), endsAt: formatUk(t.endsAt) }));
    case "cancel_reversed":
      // No member email per spec (PlanManager toast / banner clear handles it).
      return null;
    case "cancelled":
      return () => renderEmail(`Your Butlers Inc ${tierName(t.tierSlug)} has ended`,
        CancellationFinalEmail({ name, tierName: tierName(t.tierSlug), endedAt: formatUk(t.endedAt) }));
    case "plan_changed":
      return () => renderEmail(`Your plan changed: ${tierName(t.fromTierSlug)} to ${tierName(t.toTierSlug)}`,
        PlanChangedEmail({
          name,
          fromTierName: tierName(t.fromTierSlug),
          toTierName: tierName(t.toTierSlug),
          newHoursTotal: t.newHoursTotal,
          renewsAt: formatUk(t.renewsAt),
        }));
    case "noop":
      return null;
  }
}

function adminRenderer(t: Transition, member: { email: string; name: string }, subscriptionId: string): RenderFn | null {
  switch (t.kind) {
    case "activated":
      return () => renderEmail(`New ${tierName(t.tierSlug)} member: ${member.name}`,
        NewMemberNotification({ name: member.name, email: member.email, tierName: tierName(t.tierSlug), monthlyPrice: tierPrice(t.tierSlug), subscriptionId }));
    case "payment_failed":
      return () => renderEmail(`Payment failed: ${member.name} (${tierName(t.tierSlug)})`,
        PaymentFailedNotification({ name: member.name, email: member.email, tierName: tierName(t.tierSlug) }));
    case "paused":
      return () => renderEmail(`Membership paused: ${member.name} (${tierName(t.tierSlug)})`,
        PauseNotification({ name: member.name, email: member.email, tierName: tierName(t.tierSlug), pausedAt: formatUk(t.pausedAt) }));
    case "cancel_scheduled":
      return () => renderEmail(`Cancellation scheduled: ${member.name} (${tierName(t.tierSlug)})`,
        CancelScheduledNotification({ name: member.name, email: member.email, tierName: tierName(t.tierSlug), endsAt: formatUk(t.endsAt) }));
    case "cancelled":
      return () => renderEmail(`Membership ended: ${member.name} (${tierName(t.tierSlug)})`,
        CancellationFinalNotification({ name: member.name, email: member.email, tierName: tierName(t.tierSlug), endedAt: formatUk(t.endedAt) }));
    default:
      return null;
  }
}

function isPermanentResendError(error: { statusCode?: number } | null | undefined): boolean {
  if (!error?.statusCode) return false;
  // 429 (rate limit) and 408 (request timeout) are transient — they should
  // be retried via the next Stripe webhook delivery rather than kept as
  // permanent failures that block all future attempts.
  if (error.statusCode === 429 || error.statusCode === 408) return false;
  return error.statusCode >= 400 && error.statusCode < 500;
}

async function sendOne(args: {
  db: SupabaseClient;
  resend: Resend;
  eventId: string;
  transitionKind: string;
  recipientKind: "member" | "admin";
  to: string;
  rendered: RenderedEmail;
}) {
  const { db, resend, eventId, transitionKind, recipientKind, to, rendered } = args;
  // Use upsert with ignoreDuplicates so a PK conflict (idempotent replay)
  // returns { data: null, error: null } and is cleanly distinguishable from
  // a real insert failure (network, RLS, etc.) which surfaces in `error`.
  const insertRes = await db
    .from("lifecycle_email_log")
    .upsert(
      { event_id: eventId, transition: transitionKind, recipient: recipientKind },
      { onConflict: "event_id,transition,recipient", ignoreDuplicates: true },
    )
    .select()
    .maybeSingle();
  if (insertRes.error) {
    // Real insert failure (network, RLS, schema). Surface it; the next
    // Stripe webhook retry will attempt the insert again.
    console.error("lifecycle.email.log_insert_failed", {
      eventId, transitionKind, recipientKind, error: insertRes.error,
    });
    return;
  }
  // Duplicate (PK conflict) — already sent on a prior delivery; skip.
  if (!insertRes.data) return;
  const send = await resend.emails.send({
    from: FROM,
    to,
    replyTo: REPLY_TO,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
  if (send.error) {
    if (isPermanentResendError(send.error as { statusCode?: number })) {
      console.error("lifecycle.email.permanent_failure", { eventId, transitionKind, recipientKind, to, error: send.error });
      // Keep the log row so we don't retry-storm.
      return;
    }
    // Transient — delete log row so the next Stripe retry can re-attempt.
    console.error("lifecycle.email.transient_failure", { eventId, transitionKind, recipientKind, to, error: send.error });
    await db.from("lifecycle_email_log").delete()
      .eq("event_id", eventId).eq("transition", transitionKind).eq("recipient", recipientKind);
    return;
  }
  if (send.data?.id) {
    await db.from("lifecycle_email_log").update({ resend_id: send.data.id })
      .eq("event_id", eventId).eq("transition", transitionKind).eq("recipient", recipientKind);
  }
}

export async function notifyLifecycle(args: NotifyArgs, db: SupabaseClient): Promise<void> {
  if (args.transition.kind === "noop") return;
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey || resendKey === "your-resend-api-key") {
    console.warn("lifecycle.notify.skipped no RESEND_API_KEY", { eventId: args.eventId, transition: args.transition.kind });
    return;
  }
  const resend = new Resend(resendKey);

  const member = memberRenderer(args.transition, args.recipient.name);
  if (member) {
    const rendered = await member();
    await sendOne({ db, resend, eventId: args.eventId, transitionKind: args.transition.kind, recipientKind: "member", to: args.recipient.email, rendered });
  }

  const admin = adminRenderer(args.transition, args.recipient, args.subscriptionId);
  const adminTo = resolveAdminRecipient();
  if (admin && adminTo) {
    const rendered = await admin();
    await sendOne({ db, resend, eventId: args.eventId, transitionKind: args.transition.kind, recipientKind: "admin", to: adminTo, rendered });
  }
}
