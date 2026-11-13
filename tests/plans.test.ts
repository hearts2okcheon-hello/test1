import { describe, expect, it } from "vitest";
import { dayLabel, dayLine, dayTone, lastPlanDay, nextDays, planText, specialDays, weekdayOf } from "@/lib/plans";
import type { DayPlan, RegularHours, TempClosure } from "@/lib/types";

// 2026-11-13 은 금요일
const HOURS: RegularHours = { mon: [["09:00", "20:00"]], tue: [["09:00", "20:00"]], fri: [["09:00", "20:00"]], sun: null };
const CLOSURES: TempClosure[] = [{ id: "c1", start_date: "2026-11-16", end_date: "2026-11-16", reason: "가족 행사" }];
const PLANS: DayPlan[] = [
  { id: "p1", day: "2026-11-17", kind: "out", start_time: "14:00:00", end_time: "16:00:00", note: "은행" },
  { id: "p2", day: "2026-11-20", kind: "early_close", start_time: null, end_time: "17:00:00", note: null },
];

describe("캘린더 날짜 (T-CAL-07)", () => {
  it("요일과 날짜 문구", () => {
    expect(weekdayOf("2026-11-13")).toBe("fri");
    expect(dayLabel("2026-11-16")).toBe("11/16 (월)");
    expect(nextDays("2026-11-29", 3)).toEqual(["2026-11-29", "2026-11-30", "2026-12-01"]);
  });
  it("오늘부터 한 달 뒤까지", () => {
    expect(lastPlanDay("2026-11-13")).toBe("2026-12-13");
    expect(lastPlanDay("2027-01-31")).toBe("2027-02-28");
  });
});

describe("일정 문구와 색 (T-CAL-08)", () => {
  it("일정 한 줄", () => {
    expect(planText({ kind: "late_open", start_time: "11:00", end_time: null })).toBe("오전 11시에 늦게 열어요");
    expect(planText(PLANS[1])).toBe("오후 5시에 일찍 닫아요");
    expect(planText(PLANS[0])).toBe("오후 2시 ~ 오후 4시 외출");
  });
  it("휴무는 빨강, 일정은 파랑, 평소는 검정", () => {
    expect(dayTone("2026-11-16", HOURS, CLOSURES, PLANS)).toBe("closed");
    expect(dayTone("2026-11-15", HOURS, CLOSURES, PLANS)).toBe("closed"); // 일요일은 쉬는 요일
    expect(dayTone("2026-11-17", HOURS, CLOSURES, PLANS)).toBe("plan");
    expect(dayTone("2026-11-13", HOURS, CLOSURES, PLANS)).toBe("normal");
  });
  it("그날 한 줄", () => {
    expect(dayLine("2026-11-16", HOURS, CLOSURES, PLANS)).toMatchObject({ label: "11/16 (월)", text: "휴무", note: "가족 행사" });
    expect(dayLine("2026-11-17", HOURS, CLOSURES, PLANS).text).toBe("09:00 - 20:00 · 오후 2시 ~ 오후 4시 외출");
    expect(dayLine("2026-11-13", HOURS, CLOSURES, PLANS).text).toBe("09:00 - 20:00");
  });
  it("앞으로 잡힌 특별한 날만 날짜순", () => {
    expect(specialDays("2026-11-13", "2026-12-13", HOURS, CLOSURES, PLANS).map((d) => d.day)).toEqual(["2026-11-16", "2026-11-17", "2026-11-20"]);
  });
});
