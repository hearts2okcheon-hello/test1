import { describe, expect, it } from "vitest";
import { NOTICE_KINDS, REPORT_KINDS, REPORT_STYLES, SIGN_STYLES, castLine, formatClock, signChip, signTitle, timeOptions } from "@/lib/signs";

describe("팻말 문구", () => {
  it("모든 상태에 칩·제목·색이 있다 (T-BADGE-04: 색 + 글자)", () => {
    for (const s of Object.values(SIGN_STYLES)) {
      expect(s.chip).not.toBe("");
      expect(s.title).not.toBe("");
      expect(s.fg).not.toBe(s.bg);
    }
  });

  it("소식 없음은 '영업 중'이라고 말하지 않는다 (T-SIGN-01)", () => {
    expect(SIGN_STYLES.none.chip).toBe("소식 없음");
    expect(SIGN_STYLES.none.title).not.toContain("영업");
  });

  it("공지 버튼 6종 (외출 중 포함)", () => {
    expect(NOTICE_KINDS.map((k) => SIGN_STYLES[k].button)).toEqual(["영업 중이에요", "오늘 쉬어요", "늦게 열어요", "재료 소진", "일찍 닫아요", "외출 중"]);
  });

  it("시각이 있으면 덧붙인다 (T-SIGN-09)", () => {
    expect(signTitle("late_open", "11:00:00")).toBe("오전 11시에 열어요");
    expect(signTitle("early_close", "17:30")).toBe("오후 5시 30분에 닫아요");
    expect(signTitle("late_open", null)).toBe("조금 늦게 열어요");
    expect(signChip("late_open", "11:00")).toBe("11시 오픈");
    expect(signChip("open", null)).toBe("영업중");
  });

  it("마을방송 한 줄은 쪽지가 먼저", () => {
    expect(castLine("open", null, "반값 할인!")).toBe("반값 할인!");
    expect(castLine("closed_today", null, null)).toBe("오늘 쉬어요");
    expect(castLine("late_open", "11:00", null)).toBe("오전 11시에 열어요");
  });
});

describe("제보", () => {
  it("버튼 4종, 줄이 길어요만 확인 질문이 없다 (T-REPORT-12)", () => {
    expect(REPORT_KINDS.map((k) => REPORT_STYLES[k].label)).toEqual(["문 닫혀 있었어요", "열려 있었어요", "재료 다 떨어졌대요", "줄이 길어요"]);
    expect(REPORT_STYLES.seen_long_line.question).toBeNull();
    expect(REPORT_STYLES.seen_closed.question).toBe("오늘 가게 문 닫았나요?");
  });
});

describe("시각", () => {
  it("formatClock", () => {
    expect(formatClock("00:00")).toBe("오전 12시");
    expect(formatClock("12:00:00")).toBe("오후 12시");
    expect(formatClock("09:05")).toBe("오전 9시 5분");
  });

  it("timeOptions 는 30분 단위", () => {
    const t = timeOptions(7, 8);
    expect(t).toEqual(["07:00", "07:30", "08:00"]);
  });
});
