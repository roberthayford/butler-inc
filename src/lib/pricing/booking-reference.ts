export function generateBookingReference(): string {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomPart = "";
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `BI-${datePart}-${randomPart}`;
}
