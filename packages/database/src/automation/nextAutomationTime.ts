import type { AutomationSchedule } from "./_schemas.ts";

/** Hourly schedules start at the next UTC hour and recur from the previous due
 * time without dispatcher drift. Legacy days remain elapsed intervals. Calendar schedules use wall time, skip
 * nonexistent DST times and missing month days, and choose the first instant
 * on ambiguous dates. Missed occurrences coalesce without a catch-up backlog. */
export function nextAutomationTime(
  schedule: AutomationSchedule,
  after: Date,
  previousDue?: Date,
): Date | null {
  if (!Number.isFinite(after.getTime())) throw new Error("INVALID_DATE");
  if (schedule.kind === "once") {
    const at = new Date(schedule.at);
    return at > after ? at : null;
  }
  if (schedule.kind === "hours") {
    const hourMs = 3600000;
    if (!previousDue)
      return new Date((Math.floor(after.getTime() / hourMs) + 1) * hourMs);
    if (!Number.isFinite(previousDue.getTime()))
      throw new Error("INVALID_DATE");
    const anchor = Math.floor(previousDue.getTime() / hourMs) * hourMs;
    const interval = schedule.every * hourMs;
    const steps = Math.max(
      1,
      Math.floor((after.getTime() - anchor) / interval) + 1,
    );
    return new Date(anchor + steps * interval);
  }
  if (schedule.kind === "days")
    return new Date(after.getTime() + schedule.every * 86400000);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: schedule.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const localEpoch = (instant: number) => {
    const p = Object.fromEntries(
      formatter
        .formatToParts(new Date(instant))
        .map(({ type, value }) => [type, value]),
    );
    return Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour),
      Number(p.minute),
    );
  };
  const [hour, minute] = schedule.time.split(":").map(Number);
  const dayMs = 86400000;
  const startDay = Math.floor(after.getTime() / dayMs) * dayMs - dayMs;
  // Local dates may lead/lag UTC. Sixty-four days include the next day 31 even
  // when the intervening month lacks it. Only inspect matching calendar dates.
  for (let day = startDay; day <= startDay + 64 * dayMs; day += dayMs) {
    const calendar = new Date(day);
    if (
      schedule.kind === "monthly"
        ? calendar.getUTCDate() !== schedule.day
        : !schedule.weekdays.includes(calendar.getUTCDay())
    )
      continue;
    const target = day + hour! * 3600000 + minute! * 60000;
    // Sampling either side discovers both offsets around a DST transition.
    const offsets = new Set(
      [-dayMs, 0, dayMs].map(
        (delta) => localEpoch(target + delta) - (target + delta),
      ),
    );
    const candidates = [...offsets]
      .map((offset) => target - offset)
      .filter((instant) => localEpoch(instant) === target)
      .sort((a, b) => a - b);
    const first = candidates[0];
    if (first !== undefined && first > after.getTime()) return new Date(first);
  }
  throw new Error("AUTOMATION_SCHEDULE_UNREACHABLE");
}
