import { describe, expect, it } from "vitest";
import { errorMessage } from "@/lib/errors";
import { parseHours } from "@/lib/hours";

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
