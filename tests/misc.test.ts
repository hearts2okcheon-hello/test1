import { describe, expect, it } from "vitest";
import { errorMessage } from "@/lib/errors";
import { addMonth, monthGrid, pickRange, seoulToday } from "@/lib/calendar";
import { formatPhone, formatWon, kakaoMapUrl, parseHours, summarizeHours } from "@/lib/hours";
import { feedLine, latestPerStore } from "@/lib/signs";
import type { RegularHours } from "@/lib/types";

describe("errorMessage", () => {
  it("RPC 에러 코드를 한국어로", () => {
    expect(errorMessage({ message: "DUPLICATE_REPORT" })).toContain("이미 알려주셨어요");
    expect(errorMessage({ message: "NOT_OWNER" })).toContain("사장님만");
    expect(errorMessage({ message: "UNDO_WINDOW_PASSED" })).toContain("5분");
  });
  it("익명 로그인이 꺼져 있으면 알려 준다", () => {
    expect(errorMessage({ message: "Anonymous sign-ins are disabled" })).toContain("익명 로그인");
  });
  it("모르는 에러는 일반 문구", () => {
    expect(errorMessage(new Error("boom"))).toBe("잠깐 문제가 생겼어요. 다시 눌러 주세요.");
    expect(errorMessage(null)).toBe("잠깐 문제가 생겼어요. 다시 눌러 주세요.");
  });
});

describe("parseHours", () => {
  it("형식", () => {
    expect(parseHours("9:00-19:00")).toEqual([["09:00", "19:00"]]);
    expect(parseHours(" 08:30 ~ 21:00 ")).toEqual([["08:30", "21:00"]]);
    expect(parseHours("휴무")).toBeNull();
    expect(parseHours("")).toBeUndefined();
    expect(parseHours("아침")).toBeUndefined();
  });
});

describe("summarizeHours", () => {
  it("붙어 있는 같은 시간끼리 묶는다", () => {
    const h = { mon: [["09:00", "20:00"]], tue: [["09:00", "20:00"]], sat: [["09:00", "20:00"]], sun: null } as RegularHours;
    expect(summarizeHours(h)).toEqual([
      { days: "월요일~토요일", text: "09:00 - 20:00", closed: false },
      { days: "일요일", text: "휴무", closed: true },
    ]);
  });
  it("정보가 없으면 빈 목록", () => {
    expect(summarizeHours(null)).toEqual([]);
  });
});

describe("formatPhone·formatWon·kakaoMapUrl", () => {
  it("전화번호", () => {
    expect(formatPhone("01012345678")).toBe("010-1234-5678");
    expect(formatPhone("0432001234")).toBe("043-200-1234");
    expect(formatPhone("023001234")).toBe("02-300-1234");
  });
  it("가격", () => expect(formatWon(5000)).toBe("5,000원"));
  it("지도 링크", () => expect(kakaoMapUrl(" 옥천읍 중앙로 1 ")).toBe("https://map.kakao.com/link/search/%EC%98%A5%EC%B2%9C%EC%9D%8D%20%EC%A4%91%EC%95%99%EB%A1%9C%201"));
});

describe("달력", () => {
  it("서울 날짜", () => expect(seoulToday(new Date("2026-11-07T15:30:00Z"))).toBe("2026-11-08"));
  it("2026년 11월은 일요일 시작 30일", () => {
    const g = monthGrid(2026, 11);
    expect(g[0]).toBe("2026-11-01");
    expect(g.length).toBe(30);
  });
  it("앞쪽 빈칸", () => expect(monthGrid(2026, 12).slice(0, 3)).toEqual([null, null, "2026-12-01"]));
  it("달 넘김", () => {
    expect(addMonth(2026, 12, 1)).toEqual([2027, 1]);
    expect(addMonth(2027, 1, -1)).toEqual([2026, 12]);
  });
  it("기간 고르기", () => {
    const a = pickRange({ start: null, end: null }, "2026-11-10");
    expect(a).toEqual({ start: "2026-11-10", end: null });
    const b = pickRange(a, "2026-11-12");
    expect(b).toEqual({ start: "2026-11-10", end: "2026-11-12" });
    expect(pickRange(b, "2026-11-20")).toEqual({ start: "2026-11-20", end: null });
    expect(pickRange(a, "2026-11-01")).toEqual({ start: "2026-11-01", end: null });
    expect(pickRange(a, "2026-11-10")).toEqual({ start: "2026-11-10", end: "2026-11-10" });
  });
});

describe("feedLine", () => {
  it("임시휴무는 기간과 사유", () => {
    expect(feedLine({ item_type: "closure", kind: "temp_closed", at_time: null, memo: "가족 여행", closure_start: "2026-11-10", closure_end: "2026-11-12" })).toBe("11월 10일 ~ 11월 12일 임시휴무 · 가족 여행");
  });
  it("소식은 글 그대로", () => {
    expect(feedLine({ item_type: "post", kind: "news", at_time: null, memo: "떡볶이 나왔어요", closure_start: null, closure_end: null })).toBe("떡볶이 나왔어요");
  });
});

describe("latestPerStore", () => {
  it("가게마다 가장 최근 소식 하나만 남긴다", () => {
    const items = [
      { store_id: "a", created_at: "2026-11-10T10:00:00Z" },
      { store_id: "b", created_at: "2026-11-10T11:00:00Z" },
      { store_id: "a", created_at: "2026-11-10T12:00:00Z" },
    ];
    expect(latestPerStore(items).map((i) => `${i.store_id}@${i.created_at.slice(11, 13)}`)).toEqual(["a@12", "b@11"]);
  });
});
