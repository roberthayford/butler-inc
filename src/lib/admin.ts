const DEFAULT_ADMIN_EMAILS = ["rob@roberthayford.com", "hello@butlersinc.com", "roberthayford@gmail.com"];

function getAdminEmails(): string[] {
  const envEmails = process.env.ADMIN_EMAILS;
  if (envEmails) {
    return envEmails.split(",").map((e) => e.trim()).filter(Boolean);
  }
  return DEFAULT_ADMIN_EMAILS;
}

export function isAdmin(email: string | undefined): boolean {
  return !!email && getAdminEmails().includes(email);
}
