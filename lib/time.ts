// 시각 표시 (모두 Asia/Seoul 기준). 만료 판단은 하지 않는다 — DB 몫. (ADR-004)

import type { RegularHours, Weekday } from "./types";
import { formatClock } from "./signs";

const TZ = "Asia/Seoul";
const WEEKDAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const WEEKDAY_KO: Record<Weekday, string> = { mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일" };

/** "방금" · "12분 전" · "3시간 전" · 그보다 오래면 "오전 8:02" */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const diffMin = Math.floor((now.getTime() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffMin < 6 * 60) return `${Math.floor(diffMin / 60)}시간 전`;
  return clockOf(iso);
}

/** "오전 8:02" */
export function clockOf(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
}

/** 서울 기준 요일 */
export function seoulWeekday(now: Date = new Date()): Weekday {
  const short = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(now).toLowerCase();
  return (WEEKDAYS.find((d) => short.startsWith(d)) ?? "mon") as Weekday;
}

/** 서울 기준 "HH:MM" */
export function seoulClock(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h === "24" ? "00" : h}:${m}`;
}

/** 오늘 평소 영업시간 문구. 정보가 없으면 null */
export function todayHours(hours: RegularHours | null, now: Date = new Date()): string | null {
  if (!hours) return null;
  const day = seoulWeekday(now);
  if (!(day in hours)) return null;
  const ranges = hours[day];
  if (ranges === null || ranges === undefined || ranges.length === 0) {
    return `${WEEKDAY_KO[day]}요일은 평소 쉬는 날`;
  }
  return "평소 " + ranges.map(([a, b]) => `${formatClock(a)} ~ ${formatClock(b)}`).join(", ");
}

/** 오늘 평소 여는 시각("HH:MM"). 쉬는 날·정보 없음이면 null */
export function todayOpenAt(hours: RegularHours | null, now: Date = new Date()): string | null {
  const ranges = hours?.[seoulWeekday(now)];
  return ranges && ranges.length > 0 ? ranges[0][0] : null;
}
