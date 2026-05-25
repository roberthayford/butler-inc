export function resolveAdminRecipient(): string | null {
  const m = process.env.MEMBERSHIP_ADMIN_NOTIFY_EMAIL?.trim();
  if (m) return m;
  const b = process.env.BOOKING_ADMIN_NOTIFY_EMAIL?.trim();
  if (b) return b;
  const list = process.env.ADMIN_EMAILS;
  if (list) {
    const first = list.split(",")[0]?.trim();
    if (first) return first;
  }
  return null;
}
