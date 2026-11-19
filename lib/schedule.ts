// 가게 캘린더 (ADR-015): 휴무 · 늦게 열기 · 일찍 닫기 · 외출을 기간으로 넣고, 고치고, 지운다.
// 휴무는 임시휴무(TempClosure) 한 줄, 나머지는 날짜마다 DayPlan 한 줄이다. 화면에서는 이어진 날을 하나의 일정으로 묶어 보여 준다.
// 날짜는 "YYYY-MM-DD" 문자열로만 다룬다

import { pickRange } from "./calendar";
import { addDays, addMonthsClamped, closureOn, dayLabel, lastPlanDay, planText, regularText, weekdayOf, type DayTone } from "./plans";
import type { DayPlan, DayPlanKind, RegularHours, TempClosure } from "./types";

export type ScheduleKind = "closed" | DayPlanKind;

/** 일정 유형: 고르는 순서, 화면 이름, 달력 칸에 적는 짧은 글씨 */
export const SCHEDULE_KINDS: { id: ScheduleKind; label: string; mark: string }[] = [
  { id: "closed", label: "휴무", mark: "휴무" },
  { id: "late_open", label: "늦게 열어요", mark: "늦게" },
  { id: "early_close", label: "일찍 닫아요", mark: "일찍" },
  { id: "out", label: "외출", mark: "외출" },
];
const ORDER = SCHEDULE_KINDS.map((k) => k.id);
const MARK = Object.fromEntries(SCHEDULE_KINDS.map((k) => [k.id, k.mark])) as Record<ScheduleKind, string>;

/** 화면에 한 줄로 보이는 일정. closureId 나 planIds 로 고치고 지운다 */
export type Schedule = {
  key: string;
  kind: ScheduleKind;
  start: string;
  end: string;
  /** 늦게 열기는 from, 일찍 닫기는 to, 외출은 둘 다 */
  from: string | null;
  to: string | null;
  note: string | null;
  closureId: string | null;
  planIds: string[];
};

/** 등록된 일정을 한 줄씩. 날짜별 일정은 이어진 날(같은 종류·시각·쪽지)을 하나로 묶고, 시작일 순으로 늘어놓는다 */
export function schedulesOf(closures: TempClosure[], plans: DayPlan[]): Schedule[] {
  const out: Schedule[] = closures.map((c) => ({ key: `c-${c.id}`, kind: "closed", start: c.start_date, end: c.end_date, from: null, to: null, note: c.reason, closureId: c.id, planIds: [] }));

  const sorted = [...plans].sort((a, b) => a.kind.localeCompare(b.kind) || a.day.localeCompare(b.day));
  let cur: Schedule | null = null;
  for (const p of sorted) {
    const same = cur && cur.kind === p.kind && addDays(cur.end, 1) === p.day && cur.from === p.start_time && cur.to === p.end_time && cur.note === p.note;
    if (cur && same) {
      cur.end = p.day;
      cur.planIds.push(p.id);
    } else {
      cur = { key: `p-${p.id}`, kind: p.kind, start: p.day, end: p.day, from: p.start_time, to: p.end_time, note: p.note, closureId: null, planIds: [p.id] };
      out.push(cur);
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start) || ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
}

/** 시작일과 끝나는 날을 모두 넣어 며칠인지 */
export function daysBetween(start: string, end: string): number {
  const utc = (day: string) => {
    const [y, m, d] = day.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(end) - utc(start)) / 86_400_000) + 1;
}

/** "12/12 (토)" · "12/12 (토) ~ 12/16 (수) · 5일" */
export function rangeLabel(start: string, end: string): string {
  return start === end ? dayLabel(start) : `${dayLabel(start)} ~ ${dayLabel(end)} · ${daysBetween(start, end)}일`;
}

/** 일정 한 줄: "휴무" · "오전 11시에 늦게 열어요" · "오후 2시 ~ 오후 4시 외출" */
export function scheduleText(s: Pick<Schedule, "kind" | "from" | "to">): string {
  return s.kind === "closed" ? "휴무" : planText({ kind: s.kind, start_time: s.from, end_time: s.to });
}

/** 달력 한 칸: 글자색(휴무 빨강 · 일정 파랑 · 평소 검정)과 숫자 아래 작은 글씨. 색만으로 구분하지 않는다 */
export type DayMark = { tone: DayTone; label: string | null };
export function dayMark(day: string, hours: RegularHours | null, closures: TempClosure[], plans: DayPlan[]): DayMark {
  if (closureOn(closures, day)) return { tone: "closed", label: "휴무" };
  if (regularText(hours, day) === null) return { tone: "closed", label: "쉬는 날" };
  const kinds = ORDER.filter((k) => plans.some((p) => p.day === day && p.kind === k));
  if (kinds.length === 0) return { tone: "normal", label: null };
  return { tone: "plan", label: MARK[kinds[0]] + (kinds.length > 1 ? `+${kinds.length - 1}` : "") };
}

/** 이어진 일정을 한 줄 띠로 잇기 위한 처음·끝. 그날 일정이 없으면 null */
export function bandOf(day: string, closures: TempClosure[], plans: DayPlan[]): { type: "closed" | "plan"; start: boolean; end: boolean } | null {
  const closure = closureOn(closures, day);
  if (closure) return { type: "closed", start: day === closure.start_date, end: day === closure.end_date };
  const has = (d: string) => plans.some((p) => p.day === d);
  if (!has(day)) return null;
  return { type: "plan", start: !has(addDays(day, -1)), end: !has(addDays(day, 1)) };
}

/** 이 기간에 넣을 수 있는 유형인가. 휴무는 언제든, 나머지는 오늘부터 한 달 뒤까지만 (DB save_schedule 과 같은 범위) */
export function kindAllowed(kind: ScheduleKind, end: string, today: string): boolean {
  return kind === "closed" || end <= lastPlanDay(today);
}

/** 달력을 넘겨 볼 수 있는 마지막 날. 사장님은 석 달 뒤, 주민은 한 달 뒤. 더 뒤에 잡힌 휴무가 있으면 거기까지 */
export function calendarEnd(today: string, closures: TempClosure[], editable: boolean): string {
  return closures.reduce((max, c) => (c.end_date > max ? c.end_date : max), addMonthsClamped(today, editable ? 3 : 1));
}

/**
 * 날짜를 눌러 기간 고르기: 첫 번째 누름이 시작, 두 번째가 끝.
 * 이미 시작한 휴무를 고칠 때(시작일이 오늘보다 앞)는 시작일을 그대로 두고 끝나는 날만 바꾼다
 */
export function tapRange(cur: { start: string | null; end: string | null }, day: string, today: string): { start: string | null; end: string | null } {
  if (cur.start && cur.start < today) return { start: cur.start, end: day };
  return pickRange(cur, day);
}

function shift(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const t = Math.min(23 * 60 + 59, Math.max(0, h * 60 + m + minutes));
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** 시간 돌림판의 처음 값. 늦게 열기는 평소 여는 시각 1시간 뒤, 일찍 닫기는 닫는 시각 1시간 앞, 외출은 오후 2~4시 */
export function defaultTimes(kind: ScheduleKind, hours: RegularHours | null, day: string): { from: string; to: string } {
  if (kind === "out") return { from: "14:00", to: "16:00" };
  const first = hours?.[weekdayOf(day)]?.[0];
  return {
    from: kind === "late_open" && first ? shift(first[0], 60) : "11:00",
    to: kind === "early_close" && first ? shift(first[1], -60) : "17:00",
  };
}
