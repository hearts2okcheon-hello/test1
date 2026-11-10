import { describe, expect, it } from "vitest";
import { swipeTarget } from "@/lib/swipe";

describe("탭 좌우 넘기기", () => {
  it("왼쪽으로 밀면 다음 탭, 오른쪽으로 밀면 이전 탭", () => {
    expect(swipeTarget("/", -120, 10)).toBe("/news");
    expect(swipeTarget("/news", -120, 10)).toBe("/owner");
    expect(swipeTarget("/news", 120, 10)).toBe("/");
    expect(swipeTarget("/owner", 120, -5)).toBe("/news");
  });
  it("양 끝에서는 더 가지 않는다", () => {
    expect(swipeTarget("/", 120, 0)).toBeNull();
    expect(swipeTarget("/owner", -120, 0)).toBeNull();
  });
  it("짧게 밀거나 위아래 스크롤이면 넘기지 않는다", () => {
    expect(swipeTarget("/", -40, 0)).toBeNull();
    expect(swipeTarget("/", -120, 90)).toBeNull();
  });
  it("탭 화면이 아닌 곳(가게 상세 등)에서는 넘기지 않는다", () => {
    expect(swipeTarget("/stores/abc", -120, 0)).toBeNull();
    expect(swipeTarget("/owner/edit", -120, 0)).toBeNull();
  });
});
