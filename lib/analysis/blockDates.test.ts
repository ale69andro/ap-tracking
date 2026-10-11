import { describe, expect, it } from "vitest";
import {
  addDays,
  getBlockTimeline,
  getBlockWindow,
  parseLocalDate,
  toLocalDateKey,
  weekIndexOf,
} from "@/lib/analysis/blockDates";

// Tests assume TZ=Europe/Berlin (see "test" script). DST: 2026-03-29 and 2026-10-25.

describe("parseLocalDate", () => {
  it("returns local midnight", () => {
    const d = parseLocalDate("2026-03-15");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
    expect(d.getTime()).toBe(new Date(2026, 2, 15).getTime());
  });

  it("returns local midnight on a DST change day", () => {
    const d = parseLocalDate("2026-10-25");
    expect(d.getDate()).toBe(25);
    expect(d.getHours()).toBe(0);
  });
});

describe("toLocalDateKey", () => {
  it("returns the local day at 23:30", () => {
    expect(toLocalDateKey(new Date(2026, 0, 15, 23, 30).getTime())).toBe("2026-01-15");
    expect(toLocalDateKey(new Date(2026, 6, 15, 23, 30).getTime())).toBe("2026-07-15");
  });

  it("returns the local day at 00:30, not the previous UTC day", () => {
    // Berlin 00:30 is 23:30 (winter) / 22:30 (summer) UTC of the previous day.
    expect(toLocalDateKey(new Date(2026, 0, 15, 0, 30).getTime())).toBe("2026-01-15");
    expect(toLocalDateKey(new Date(2026, 6, 15, 0, 30).getTime())).toBe("2026-07-15");
  });

  it("zero-pads month and day", () => {
    expect(toLocalDateKey(new Date(2026, 2, 5, 12, 0).getTime())).toBe("2026-03-05");
  });
});

describe("addDays", () => {
  it("returns the same day for 0", () => {
    expect(addDays("2026-05-17", 0)).toBe("2026-05-17");
  });

  it("crosses month boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-04-30", 1)).toBe("2026-05-01");
  });

  it("crosses the year boundary", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("handles leap days", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-02-28", 2)).toBe("2024-03-01");
  });

  it("supports negative offsets", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("is not shifted by the spring DST change (2026-03-29)", () => {
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30");
    expect(addDays("2026-03-29", -1)).toBe("2026-03-28");
    expect(addDays("2026-03-25", 7)).toBe("2026-04-01");
  });

  it("is not shifted by the autumn DST change (2026-10-25)", () => {
    expect(addDays("2026-10-24", 1)).toBe("2026-10-25");
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26");
    expect(addDays("2026-10-25", -1)).toBe("2026-10-24");
    expect(addDays("2026-10-22", 7)).toBe("2026-10-29");
  });

  it("spans both DST changes in one call", () => {
    // Day of year 60 + 300 = 360 -> 26 December (2026 is not a leap year).
    expect(addDays("2026-03-01", 300)).toBe("2026-12-26");
  });
});

describe("getBlockWindow", () => {
  it("covers 4 weeks", () => {
    expect(getBlockWindow("2026-01-05", 4)).toEqual({ start: "2026-01-05", endExclusive: "2026-02-02" });
  });

  it("covers 8 weeks", () => {
    expect(getBlockWindow("2026-01-05", 8)).toEqual({ start: "2026-01-05", endExclusive: "2026-03-02" });
  });

  it("covers 12 weeks", () => {
    expect(getBlockWindow("2026-01-05", 12)).toEqual({ start: "2026-01-05", endExclusive: "2026-03-30" });
  });

  it("covers 4 weeks across the autumn DST change", () => {
    expect(getBlockWindow("2026-10-05", 4)).toEqual({ start: "2026-10-05", endExclusive: "2026-11-02" });
  });

  it("ends the day after an earlier endedAt", () => {
    expect(getBlockWindow("2026-01-05", 4, "2026-01-20")).toEqual({
      start: "2026-01-05",
      endExclusive: "2026-01-21",
    });
  });

  it("keeps the start day when endedAt equals it", () => {
    expect(getBlockWindow("2026-01-05", 4, "2026-01-05")).toEqual({
      start: "2026-01-05",
      endExclusive: "2026-01-06",
    });
  });

  it("does not extend the window when endedAt is later than planned", () => {
    expect(getBlockWindow("2026-01-05", 4, "2026-06-01")).toEqual({
      start: "2026-01-05",
      endExclusive: "2026-02-02",
    });
  });

  it("gives the planned end when endedAt is the last block day", () => {
    expect(getBlockWindow("2026-01-05", 4, "2026-02-01").endExclusive).toBe("2026-02-02");
  });
});

describe("weekIndexOf", () => {
  const start = "2026-01-05";

  it("maps day 0 to week 1", () => {
    expect(weekIndexOf("2026-01-05", start)).toBe(1);
  });

  it("maps day 6 to week 1", () => {
    expect(weekIndexOf("2026-01-11", start)).toBe(1);
  });

  it("maps day 7 to week 2", () => {
    expect(weekIndexOf("2026-01-12", start)).toBe(2);
  });

  it("maps day 27 to week 4", () => {
    expect(weekIndexOf("2026-02-01", start)).toBe(4);
  });

  it("maps day 28 to week 5", () => {
    expect(weekIndexOf("2026-02-02", start)).toBe(5);
  });

  it("is stable across the spring DST change", () => {
    // Start 2026-03-23: day 6 is the 23h day 2026-03-29, day 7 is 2026-03-30.
    expect(weekIndexOf("2026-03-29", "2026-03-23")).toBe(1);
    expect(weekIndexOf("2026-03-30", "2026-03-23")).toBe(2);
  });

  it("is stable across the autumn DST change", () => {
    // Start 2026-10-19: day 6 is the 25h day 2026-10-25, day 7 is 2026-10-26.
    expect(weekIndexOf("2026-10-25", "2026-10-19")).toBe(1);
    expect(weekIndexOf("2026-10-26", "2026-10-19")).toBe(2);
    expect(weekIndexOf("2026-11-01", "2026-10-05")).toBe(4);
    expect(weekIndexOf("2026-11-02", "2026-10-05")).toBe(5);
  });

  it("counts whole days over a longer span after the spring DST change", () => {
    // 2026-03-01 -> 2026-04-05 is 35 days.
    expect(weekIndexOf("2026-04-05", "2026-03-01")).toBe(6);
  });
});

describe("getBlockTimeline", () => {
  it("reports the running week inside the block", () => {
    expect(getBlockTimeline("2026-01-05", 4, "2026-01-05")).toEqual({ currentWeek: 1, notStarted: false, expired: false });
    expect(getBlockTimeline("2026-01-05", 4, "2026-01-20")).toEqual({ currentWeek: 3, notStarted: false, expired: false });
  });

  it("is not expired on the last block day and expired the day after", () => {
    expect(getBlockTimeline("2026-01-05", 4, "2026-02-01")).toEqual({ currentWeek: 4, notStarted: false, expired: false });
    expect(getBlockTimeline("2026-01-05", 4, "2026-02-02")).toEqual({ currentWeek: 4, notStarted: false, expired: true });
  });

  it("clamps the week for a block that starts in the future", () => {
    expect(getBlockTimeline("2026-01-05", 8, "2025-12-20")).toEqual({ currentWeek: 1, notStarted: true, expired: false });
  });
});
