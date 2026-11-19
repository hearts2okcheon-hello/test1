import { describe, expect, it } from "vitest";
import { addMonthsClamped } from "@/lib/plans";
import { bandOf, calendarEnd, dayMark, daysBetween, defaultTimes, kindAllowed, rangeLabel, scheduleText, schedulesOf, tapRange } from "@/lib/schedule";
import type { DayPlan, RegularHours, TempClosure } from "@/lib/types";

// 2026-12-13 은 일요일 (쉬는 요일), 12-14 는 월요일
const OPEN: [string, string][] = [["09:00", "20:00"]];
const HOURS: RegularHours = { mon: OPEN, tue: OPEN, wed: OPEN, thu: OPEN, fri: OPEN, sat: OPEN, sun: null };
const CLOSURES: TempClosure[] = [{ id: "c1", start_date: "2026-12-21", end_date: "2026-12-23", reason: "가족 여행" }];
const late = (id: string, day: string, note: string | null = null): DayPlan => ({ id, day, kind: "late_open", start_time: "11:00:00", end_time: null, note });
const PLANS: DayPlan[] = [
  late("p1", "2026-12-14"),
  late("p2", "2026-12-15"),
  late("p3", "2026-12-16"),
  { id: "p4", day: "2026-12-15", kind: "out", start_time: "14:00:00", end_time: "16:00:00", note: "은행" },
  late("p5", "2026-12-18"),
];

describe("등록된 일정 묶기 (T-CAL-10)", () => {
  const list = schedulesOf(CLOSURES, PLANS);
  it("이어진 날짜(같은 종류·시각·쪽지)는 하나의 기간으로 묶고, 시작일 순으로 늘어놓는다", () => {
    expect(list.map((s) => `${s.kind} ${s.start}~${s.end}`)).toEqual([
      "late_open 2026-12-14~2026-12-16",
      "out 2026-12-15~2026-12-15",
      "late_open 2026-12-18~2026-12-18",
      "closed 2026-12-21~2026-12-23",
    ]);
  });
  it("묶인 일정은 고치고 지울 때 쓸 번호를 모두 가진다", () => {
    expect(list[0].planIds).toEqual(["p1", "p2", "p3"]);
    expect(list[0].closureId).toBeNull();
    expect(list[3].closureId).toBe("c1");
    expect(list[3].planIds).toEqual([]);
    expect(list[3].note).toBe("가족 여행");
  });
  it("시각이나 쪽지가 다르면 이어진 날이어도 따로 둔다", () => {
    const other = schedulesOf([], [late("a", "2026-12-14"), late("b", "2026-12-15", "늦잠"), { ...late("c", "2026-12-16"), start_time: "12:00:00" }]);
    expect(other.map((s) => `${s.start}~${s.end}`)).toEqual(["2026-12-14~2026-12-14", "2026-12-15~2026-12-15", "2026-12-16~2026-12-16"]);
  });
});

describe("기간과 일정 문구 (T-CAL-11)", () => {
  it("며칠인지, 기간을 어떻게 적는지", () => {
    expect(daysBetween("2026-12-12", "2026-12-16")).toBe(5);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(2);
    expect(rangeLabel("2026-12-12", "2026-12-12")).toBe("12/12 (토)");
    expect(rangeLabel("2026-12-12", "2026-12-16")).toBe("12/12 (토) ~ 12/16 (수) · 5일");
  });
  it("일정 한 줄", () => {
    expect(scheduleText({ kind: "closed", from: null, to: null })).toBe("휴무");
    expect(scheduleText({ kind: "late_open", from: "11:00:00", to: null })).toBe("오전 11시에 늦게 열어요");
    expect(scheduleText({ kind: "out", from: "14:00", to: "16:00" })).toBe("오후 2시 ~ 오후 4시 외출");
  });
});

describe("달력 한 칸의 표시 (T-CAL-12)", () => {
  it("유형마다 색과 작은 글씨로 구분한다", () => {
    expect(dayMark("2026-12-22", HOURS, CLOSURES, PLANS)).toEqual({ tone: "closed", label: "휴무" });
    expect(dayMark("2026-12-13", HOURS, CLOSURES, PLANS)).toEqual({ tone: "closed", label: "쉬는 날" });
    expect(dayMark("2026-12-14", HOURS, CLOSURES, PLANS)).toEqual({ tone: "plan", label: "늦게" });
    expect(dayMark("2026-12-17", HOURS, CLOSURES, PLANS)).toEqual({ tone: "normal", label: null });
  });
  it("하루에 일정이 둘이면 첫 번째와 +1", () => {
    expect(dayMark("2026-12-15", HOURS, CLOSURES, PLANS)).toEqual({ tone: "plan", label: "늦게+1" });
  });
  it("이어진 일정은 한 줄 띠로 잇는다 (처음과 끝)", () => {
    expect(bandOf("2026-12-21", CLOSURES, PLANS)).toEqual({ type: "closed", start: true, end: false });
    expect(bandOf("2026-12-22", CLOSURES, PLANS)).toEqual({ type: "closed", start: false, end: false });
    expect(bandOf("2026-12-23", CLOSURES, PLANS)).toEqual({ type: "closed", start: false, end: true });
    expect(bandOf("2026-12-14", CLOSURES, PLANS)).toEqual({ type: "plan", start: true, end: false });
    expect(bandOf("2026-12-16", CLOSURES, PLANS)).toEqual({ type: "plan", start: false, end: true });
    expect(bandOf("2026-12-18", CLOSURES, PLANS)).toEqual({ type: "plan", start: true, end: true });
    expect(bandOf("2026-12-17", CLOSURES, PLANS)).toBeNull();
  });
});

describe("기간 고르기와 넣을 수 있는 유형 (T-CAL-13)", () => {
  it("몇 달 뒤 같은 날 (말일은 그 달 끝으로)", () => {
    expect(addMonthsClamped("2026-11-19", 1)).toBe("2026-12-19");
    expect(addMonthsClamped("2026-11-30", 3)).toBe("2027-02-28");
  });
  it("휴무는 언제든, 나머지는 오늘부터 한 달 뒤까지만", () => {
    expect(kindAllowed("closed", "2027-01-20", "2026-11-19")).toBe(true);
    expect(kindAllowed("late_open", "2026-12-19", "2026-11-19")).toBe(true);
    expect(kindAllowed("out", "2026-12-20", "2026-11-19")).toBe(false);
  });
  it("달력은 사장님에게 석 달 뒤까지, 주민에게 한 달 뒤까지. 더 뒤에 잡힌 휴무가 있으면 거기까지", () => {
    expect(calendarEnd("2026-11-19", [], true)).toBe("2027-02-19");
    expect(calendarEnd("2026-11-19", [], false)).toBe("2026-12-19");
    expect(calendarEnd("2026-11-19", [{ id: "x", start_date: "2027-03-01", end_date: "2027-03-05", reason: null }], false)).toBe("2027-03-05");
  });
  it("이미 시작한 휴무를 고칠 때는 시작일을 그대로 두고 끝나는 날만 바꾼다", () => {
    expect(tapRange({ start: "2026-11-17", end: "2026-11-20" }, "2026-11-25", "2026-11-19")).toEqual({ start: "2026-11-17", end: "2026-11-25" });
    // 평소에는 첫 번째 누름이 시작, 두 번째가 끝
    expect(tapRange({ start: null, end: null }, "2026-11-25", "2026-11-19")).toEqual({ start: "2026-11-25", end: null });
    expect(tapRange({ start: "2026-11-25", end: null }, "2026-11-27", "2026-11-19")).toEqual({ start: "2026-11-25", end: "2026-11-27" });
  });
});

describe("시각의 처음 값 (T-CAL-14)", () => {
  it("늦게 열기는 평소 여는 시각 1시간 뒤, 일찍 닫기는 닫는 시각 1시간 앞, 외출은 오후 2~4시", () => {
    expect(defaultTimes("late_open", HOURS, "2026-12-14")).toEqual({ from: "10:00", to: "17:00" });
    expect(defaultTimes("early_close", HOURS, "2026-12-14")).toEqual({ from: "11:00", to: "19:00" });
    expect(defaultTimes("out", HOURS, "2026-12-14")).toEqual({ from: "14:00", to: "16:00" });
  });
  it("영업시간을 모르면 오전 11시 · 오후 5시", () => {
    expect(defaultTimes("late_open", null, "2026-12-14")).toEqual({ from: "11:00", to: "17:00" });
    expect(defaultTimes("early_close", HOURS, "2026-12-13")).toEqual({ from: "11:00", to: "17:00" });
  });
});
