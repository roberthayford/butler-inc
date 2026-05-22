export function timeToMinutes(time: string): number {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function generateTimeSlots(
  startHour: number = 6,
  endHour: number = 22,
  intervalMinutes: number = 15
): string[] {
  const slots: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      if (h === endHour && m > 0) break;
      slots.push(minutesToTime(h * 60 + m));
    }
  }
  return slots;
}

export function getAvailableEndTimes(
  startTime: string,
  minimumHours: number,
  maxEndHour: number = 23
): string[] {
  const startMinutes = timeToMinutes(startTime);
  const earliestEnd = startMinutes + minimumHours * 60;
  const maxEndMinutes = maxEndHour * 60;

  if (earliestEnd > maxEndMinutes) return [];

  const slots: string[] = [];
  for (let m = earliestEnd; m <= maxEndMinutes; m += 15) {
    slots.push(minutesToTime(m));
  }
  return slots;
}

export function filterPastTimes(
  slots: string[],
  selectedDate: string
): string[] {
  const today = new Date().toISOString().split("T")[0];
  if (selectedDate !== today) return slots;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return slots.filter((slot) => timeToMinutes(slot) > currentMinutes);
}

export function formatDuration(durationHours: number): string {
  const wholeHours = Math.floor(durationHours);
  const minutes = Math.round((durationHours - wholeHours) * 60);

  if (minutes === 0) {
    return `${wholeHours} ${wholeHours === 1 ? "hour" : "hours"}`;
  }

  return `${wholeHours} ${wholeHours === 1 ? "hour" : "hours"} ${minutes} minutes`;
}
