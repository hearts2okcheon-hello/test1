import { describe, expect, it } from "vitest";
import { clockOf, dateOf, seoulClock, seoulWeekday, timeAgo, todayHours, todayOpenAt } from "@/lib/time";
import type { RegularHours } from "@/lib/types";

// 2026-11-02 은 월요일. 테스트는 TZ=UTC 로 돌아서 서울 변환을 확인한다 (vitest.config.ts)
const MON_0030_SEOUL = new Date("2026-11-02T00:30:00+09:00"); // UTC 로는 일요일
const MON_0830_SEOUL = new Date("2026-11-02T08:30:00+09:00");

const HOURS: RegularHours = { mon: [["08:00", "19:00"]], sun: null };

describe("timeAgo (T-BADGE-03)", () => {
  const now = new Date("2026-11-02T12:00:00+09:00");
  it("방금 · 분(59분까지) · 시간(24시간까지) · 그 뒤는 날짜", () => {
    expect(timeAgo("2026-11-02T11:59:40+09:00", now)).toBe("방금");
    expect(timeAgo("2026-11-02T11:48:00+09:00", now)).toBe("12분 전");
    expect(timeAgo("2026-11-02T09:00:00+09:00", now)).toBe("3시간 전");
    expect(timeAgo("2026-11-02T11:59:00+09:00", now)).toBe("1분 전");
    expect(timeAgo("2026-11-02T11:01:00+09:00", now)).toBe("59분 전");
    expect(timeAgo("2026-11-02T11:00:00+09:00", now)).toBe("1시간 전");
    expect(timeAgo("2026-11-02T05:02:00+09:00", now)).toBe("6시간 전");
    expect(timeAgo("2026-11-01T12:00:00+09:00", now)).toBe("24시간 전");
    expect(timeAgo("2026-11-01T11:59:00+09:00", now)).toBe("11월 1일");
    expect(timeAgo("2025-12-31T23:30:00+09:00", now)).toBe("2025년 12월 31일");
  });
  it("dateOf 는 서울 날짜", () => {
    expect(dateOf("2026-11-01T15:30:00Z", now)).toBe("11월 2일");
  });
  it("clockOf 는 서울 시각", () => {
    expect(clockOf("2026-11-01T23:02:00Z")).toBe("오전 8:02");
  });
});

describe("서울 기준 요일·시각 (ADR-004)", () => {
  it("UTC 로는 일요일이어도 서울은 월요일", () => {
    expect(seoulWeekday(MON_0030_SEOUL)).toBe("mon");
    expect(seoulClock(MON_0030_SEOUL)).toBe("00:30");
  });
});

describe("평소 영업시간", () => {
  it("오늘 요일의 시간", () => {
    expect(todayHours(HOURS, MON_0830_SEOUL)).toBe("평소 오전 8시 ~ 오후 7시");
    expect(todayOpenAt(HOURS, MON_0830_SEOUL)).toBe("08:00");
  });
  it("정기 휴무일", () => {
    const sun = new Date("2026-11-01T10:00:00+09:00");
    expect(todayHours(HOURS, sun)).toBe("일요일은 평소 쉬는 날");
    expect(todayOpenAt(HOURS, sun)).toBeNull();
  });
  it("정보 없음", () => {
    expect(todayHours(null, MON_0830_SEOUL)).toBeNull();
    expect(todayHours({ tue: [["09:00", "18:00"]] }, MON_0830_SEOUL)).toBeNull();
  });
});
