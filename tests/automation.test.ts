import { describe, expect, it } from "vitest";
import { automationInputSchema } from "../packages/database/src/automation/_schemas.ts";
import { nextAutomationTime } from "../packages/database/src/automation/nextAutomationTime.ts";

describe("automation schedules", () => {
  it("advances elapsed intervals and consumes one-time dates", () => {
    const after = new Date("2026-03-28T12:00:00Z");
    expect(
      nextAutomationTime({ kind: "hours", every: 3 }, after)?.toISOString(),
    ).toBe("2026-03-28T13:00:00.000Z");
    expect(
      nextAutomationTime({ kind: "days", every: 1 }, after)?.toISOString(),
    ).toBe("2026-03-29T12:00:00.000Z");
    expect(
      nextAutomationTime({ kind: "once", at: after.toISOString() }, after),
    ).toBeNull();
    expect(
      nextAutomationTime(
        { kind: "once", at: "2026-04-01T10:00:00+02:00" },
        after,
      )?.toISOString(),
    ).toBe("2026-04-01T08:00:00.000Z");
  });
  it("uses local weekdays and skips missing DST wall times", () => {
    expect(
      nextAutomationTime(
        {
          kind: "weekly",
          weekdays: [0],
          time: "02:30",
          timezone: "Europe/Vienna",
        },
        new Date("2026-03-28T12:00:00Z"),
      )?.toISOString(),
    ).toBe("2026-04-05T00:30:00.000Z");
  });
  it("does not repeat an ambiguous wall time on the same date", () => {
    expect(
      nextAutomationTime(
        {
          kind: "weekly",
          weekdays: [0],
          time: "02:30",
          timezone: "Europe/Vienna",
        },
        new Date("2026-10-25T00:30:00Z"),
      )?.toISOString(),
    ).toBe("2026-11-01T01:30:00.000Z");
  });
  it("skips months without the chosen day", () => {
    expect(
      nextAutomationTime(
        { kind: "monthly", day: 31, time: "09:00", timezone: "Europe/Vienna" },
        new Date("2026-01-31T08:00:00Z"),
      )?.toISOString(),
    ).toBe("2026-03-31T07:00:00.000Z");
  });
  it("rejects invalid schedule configuration", () => {
    const base = {
      name: "Test",
      agentId: "agent",
      message: "Report",
      enabled: true,
    };
    for (const schedule of [
      { kind: "hours", every: 0 },
      {
        kind: "weekly",
        weekdays: [],
        time: "09:00",
        timezone: "Europe/Vienna",
      },
      { kind: "monthly", day: 32, time: "09:00", timezone: "Europe/Vienna" },
      { kind: "monthly", day: 1, time: "25:00", timezone: "Europe/Vienna" },
      { kind: "monthly", day: 1, time: "09:00", timezone: "invalid" },
    ])
      expect(
        automationInputSchema.safeParse({
          ...base,
          trigger: { type: "time", schedule },
        }).success,
      ).toBe(false);
  });
});

it("anchors hourly runs to full hours without drift or catch-up bursts", () => {
  const schedule = { kind: "hours" as const, every: 3 };
  expect(
    nextAutomationTime(
      schedule,
      new Date("2026-11-14T12:34:56.789Z"),
    )?.toISOString(),
  ).toBe("2026-11-14T13:00:00.000Z");
  const due = new Date("2026-11-14T13:00:00Z");
  expect(
    nextAutomationTime(
      schedule,
      new Date("2026-11-14T13:00:09Z"),
      due,
    )?.toISOString(),
  ).toBe("2026-11-14T16:00:00.000Z");
  expect(
    nextAutomationTime(
      schedule,
      new Date("2026-11-15T01:20:00Z"),
      due,
    )?.toISOString(),
  ).toBe("2026-11-15T04:00:00.000Z");
  expect(
    nextAutomationTime(
      schedule,
      new Date("2026-11-14T16:00:00Z"),
      due,
    )?.toISOString(),
  ).toBe("2026-11-14T19:00:00.000Z");
  expect(() => nextAutomationTime(schedule, due, new Date("bad"))).toThrow(
    "INVALID_DATE",
  );
});
