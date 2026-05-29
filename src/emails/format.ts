const BUTLER_DISPLAY_NAMES: Record<string, string> = {
  busy: "Busy Butler",
  baby: "Baby Butler",
  bougie: "Bougie Butler",
  base: "Base Butler",
  budget: "Budget Butler",
  bespoke: "Bespoke Butler",
};

export function formatButlerName(butlerType: string): string {
  const normalized = butlerType.trim().toLowerCase();
  if (BUTLER_DISPLAY_NAMES[normalized]) {
    return BUTLER_DISPLAY_NAMES[normalized];
  }

  if (normalized.endsWith(" butler")) {
    return normalized
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  return `${butlerType.charAt(0).toUpperCase()}${butlerType.slice(1)} Butler`;
}
