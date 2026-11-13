// 사장님 캘린더와 가게 화면의 "날짜별 영업 일정" 문구.
// 날짜는 "YYYY-MM-DD" 문자열로만 다룬다. 지금 영업 중인지는 여기서 판단하지 않는다 (DB okc_schedule_status 몫)

import { formatClock } from "./signs";
import type { DayPlan, RegularHours, TempClosure, Weekday } from "./types";

/** 내 정보에서 고르는 사는 곳 (옥천군 읍·면) */
export const AREAS = ["옥천읍", "동이면", "안남면", "안내면", "청성면", "청산면", "이원면", "군서면", "군북면"];

const WEEKDAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const KO: Record<Weekday, string> = { sun: "일", mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토" };

export function weekdayOf(day: string): Weekday {
  const [y, m, d] = day.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** 오늘부터 한 달 뒤 같은 날까지 (DB set_day_plan 과 같은 범위) */
export function lastPlanDay(today: string): string {
  const [y, m, d] = today.split("-").map(Number);
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d, days))).toISOString().slice(0, 10);
}

/** "2026-11-16" → "11/16 (월)" */
export function dayLabel(day: string): string {
  const [, m, d] = day.split("-").map(Number);
  return `${m}/${d} (${KO[weekdayOf(day)]})`;
}

/** "금요일" */
export function weekdayName(day: string): string {
  return `${KO[weekdayOf(day)]}요일`;
}

/** 그날 평소 영업시간 "09:00 - 20:00". 쉬는 요일이면 null, 정보가 없으면 undefined */
export function regularText(hours: RegularHours | null, day: string): string | null | undefined {
  if (!hours) return undefined;
  const w = weekdayOf(day);
  if (!(w in hours)) return undefined;
  const ranges = hours[w];
  if (!ranges || ranges.length === 0) return null;
  return ranges.map(([a, b]) => `${a} - ${b}`).join(", ");
}

/** 일정 한 줄: "오전 11시에 열어요" · "오후 5시에 일찍 닫아요" · "오후 2시 ~ 오후 4시 외출" */
export function planText(p: Pick<DayPlan, "kind" | "start_time" | "end_time">): string {
  if (p.kind === "late_open" && p.start_time) return `${formatClock(p.start_time)}에 늦게 열어요`;
  if (p.kind === "early_close" && p.end_time) return `${formatClock(p.end_time)}에 일찍 닫아요`;
  if (p.kind === "out" && p.start_time && p.end_time) return `${formatClock(p.start_time)} ~ ${formatClock(p.end_time)} 외출`;
  return "";
}

export function closureOn(closures: TempClosure[], day: string): TempClosure | undefined {
  return closures.find((c) => c.start_date <= day && day <= c.end_date);
}

/** 달력 글자색: 휴무(임시휴무·쉬는 요일)는 빨강, 일정이 있으면 파랑, 평소대로면 검정 */
export type DayTone = "closed" | "plan" | "normal";
export function dayTone(day: string, hours: RegularHours | null, closures: TempClosure[], plans: DayPlan[]): DayTone {
  if (closureOn(closures, day) || regularText(hours, day) === null) return "closed";
  return plans.some((p) => p.day === day) ? "plan" : "normal";
}

export type DayLine = { day: string; label: string; text: string; tone: DayTone; note: string | null };

/** 그날 한 줄: "11/16 (월) 휴무" · "11/16 (월) 09:00 - 20:00 · 오후 2시 ~ 오후 4시 외출" */
export function dayLine(day: string, hours: RegularHours | null, closures: TempClosure[], plans: DayPlan[]): DayLine {
  const label = dayLabel(day);
  const closure = closureOn(closures, day);
  if (closure) return { day, label, text: "휴무", tone: "closed", note: closure.reason };
  const regular = regularText(hours, day);
  if (regular === null) return { day, label, text: "휴무 (쉬는 요일)", tone: "closed", note: null };
  const mine = plans.filter((p) => p.day === day);
  const base = regular ?? "영업시간 정보 없음";
  if (mine.length === 0) return { day, label, text: base, tone: "normal", note: null };
  return {
    day,
    label,
    text: [base, ...mine.map(planText)].join(" · "),
    tone: "plan",
    note: mine.map((p) => p.note).filter(Boolean).join(" · ") || null,
  };
}

/** 오늘부터 n일 */
export function nextDays(today: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i));
}

/** from 뒤로 잡혀 있는 특별한 날(휴무·일정)만, 날짜순 */
export function specialDays(from: string, until: string, hours: RegularHours | null, closures: TempClosure[], plans: DayPlan[]): DayLine[] {
  const days = new Set<string>();
  for (const p of plans) if (p.day >= from && p.day <= until) days.add(p.day);
  for (const c of closures) {
    for (let d = c.start_date < from ? from : c.start_date; d <= c.end_date && d <= until; d = addDays(d, 1)) days.add(d);
  }
  return [...days].sort().map((d) => dayLine(d, hours, closures, plans));
}
