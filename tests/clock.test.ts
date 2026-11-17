import { describe, expect, it } from "vitest";
import { joinClock, nextHalfHour, splitClock } from "@/lib/clock";
import { neighborCategory } from "@/lib/categories";
import { postParts } from "@/lib/signs";
import { alertGroup, alertIdFrom, badgeText } from "@/lib/alerts";

describe("시간 돌림판 (T-TIME-01)", () => {
  it("24시간 시각을 오전/오후 · 시 · 분으로 나눈다", () => {
    expect(splitClock("13:05")).toEqual({ pm: true, hour: 1, minute: 5 });
    expect(splitClock("00:00")).toEqual({ pm: false, hour: 12, minute: 0 });
    expect(splitClock("12:30")).toEqual({ pm: true, hour: 12, minute: 30 });
    expect(splitClock("")).toEqual({ pm: false, hour: 12, minute: 0 });
  });
  it("다시 합치면 같은 시각", () => {
    for (const t of ["00:00", "00:59", "09:07", "12:00", "12:01", "18:45", "23:59"]) expect(joinClock(splitClock(t))).toBe(t);
  });
  it("처음 값은 다음 정각이나 30분", () => {
    expect(nextHalfHour("16:07")).toBe("16:30");
    expect(nextHalfHour("16:30")).toBe("17:00");
    expect(nextHalfHour("23:50")).toBe("23:30");
  });
});

describe("카테고리 밀기 (T-SWIPE-04)", () => {
  it("왼쪽으로 밀면 다음, 오른쪽으로 밀면 앞 카테고리", () => {
    expect(neighborCategory("cafe", -80)).toBe("korean");
    expect(neighborCategory("korean", 80)).toBe("cafe");
  });
  it("끝에서는 넘어가지 않는다", () => {
    expect(neighborCategory("cafe", 80)).toBeNull();
    expect(neighborCategory("etc", -80)).toBeNull();
    expect(neighborCategory(undefined, -80)).toBeNull();
  });
});

describe("소식 글의 제목과 본문 (T-POST-01)", () => {
  it("첫 줄이 제목, 나머지가 본문", () => {
    expect(postParts("뿌링 호떡 출시\n1개 2000원\n2개 3000원")).toEqual({ title: "뿌링 호떡 출시", rest: "1개 2000원\n2개 3000원" });
  });
  it("한 줄이면 제목만", () => {
    expect(postParts("오픈 이벤트 진행합니다")).toEqual({ title: "오픈 이벤트 진행합니다", rest: "" });
  });
});

describe("알림 목록 (T-ALERT-06)", () => {
  const now = new Date("2026-11-17T12:00:00+09:00");
  it("오늘 · 이번 주 · 이전으로 묶는다", () => {
    expect(alertGroup("2026-11-17T03:00:00+09:00", now)).toBe("오늘");
    expect(alertGroup("2026-11-14T12:00:00+09:00", now)).toBe("이번 주");
    expect(alertGroup("2026-11-01T12:00:00+09:00", now)).toBe("이전");
  });
  it("벨 숫자는 99개가 넘으면 99+", () => {
    expect(badgeText(3)).toBe("3");
    expect(badgeText(120)).toBe("99+");
  });
  it("알림을 눌러 들어온 주소에서 번호를 꺼낸다", () => {
    expect(alertIdFrom("?alert=12")).toBe(12);
    expect(alertIdFrom("?reported=seen_open&alert=7")).toBe(7);
    expect(alertIdFrom("?alert=abc")).toBeNull();
    expect(alertIdFrom("")).toBeNull();
  });
});
