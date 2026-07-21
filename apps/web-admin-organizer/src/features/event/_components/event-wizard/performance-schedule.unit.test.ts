import { describe, expect, it } from "vitest";

import {
  buildPerformanceSchedule,
  getDefaultPerformanceSchedule,
  getDoorsOpenTimeValue,
  getPerformanceDateValue,
  getStartsTimeValue,
} from "./performance-schedule";

describe("performance-schedule", () => {
  it("デフォルト値は1週間後の月日と18:00の開場・開始時刻にする", () => {
    const schedule = getDefaultPerformanceSchedule(new Date(2026, 6, 21, 10, 0));

    expect(schedule).toEqual({
      performanceDate: "2026-07-28",
      doorsOpenAt: "2026-07-28T18:00",
      startsAt: "2026-07-28T18:00",
    });
  });

  it("月日だけを選んだ状態でも入力値として保持する", () => {
    const schedule = buildPerformanceSchedule({
      schedule: { doorsOpenAt: "", startsAt: "" },
      date: "2026-09-12",
    });

    expect(schedule).toEqual({
      performanceDate: "2026-09-12",
      doorsOpenAt: "",
      startsAt: "",
    });
    expect(getPerformanceDateValue(schedule)).toBe("2026-09-12");
  });

  it("月日と開場時刻・開始時刻から同日の日時を組み立てる", () => {
    const schedule = buildPerformanceSchedule({
      schedule: { doorsOpenAt: "", startsAt: "" },
      date: "2026-09-12",
      doorsOpenTime: "17:00",
      startsTime: "18:00",
    });

    expect(schedule).toEqual({
      performanceDate: "2026-09-12",
      doorsOpenAt: "2026-09-12T17:00",
      startsAt: "2026-09-12T18:00",
    });
  });

  it("開始時刻が開場時刻より早い場合は開始日時を翌日にする", () => {
    const schedule = buildPerformanceSchedule({
      schedule: { doorsOpenAt: "", startsAt: "" },
      date: "2026-09-12",
      doorsOpenTime: "23:30",
      startsTime: "00:00",
    });

    expect(schedule).toEqual({
      performanceDate: "2026-09-12",
      doorsOpenAt: "2026-09-12T23:30",
      startsAt: "2026-09-13T00:00",
    });
  });

  it("日付を変更すると日またぎを保ったまま日時を再計算する", () => {
    const schedule = buildPerformanceSchedule({
      schedule: {
        doorsOpenAt: "2026-09-12T23:30",
        startsAt: "2026-09-13T00:00",
      },
      date: "2026-10-03",
    });

    expect(schedule).toEqual({
      performanceDate: "2026-10-03",
      doorsOpenAt: "2026-10-03T23:30",
      startsAt: "2026-10-04T00:00",
    });
  });

  it("日時文字列から月日・時刻の入力値を取り出す", () => {
    const schedule = {
      doorsOpenAt: "2026-09-12T23:30",
      startsAt: "2026-09-13T00:00",
    };

    expect(getPerformanceDateValue(schedule)).toBe("2026-09-12");
    expect(getDoorsOpenTimeValue(schedule)).toBe("23:30");
    expect(getStartsTimeValue(schedule)).toBe("00:00");
  });
});
