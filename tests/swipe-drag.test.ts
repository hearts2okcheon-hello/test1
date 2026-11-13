import { describe, expect, it } from "vitest";
import { dragOffset, neighborTab, swipeLock } from "@/lib/swipe";

describe("탭 밀기: 손가락을 따라오는 화면 (T-SWIPE-03)", () => {
  it("조금 움직였을 때는 아직 정하지 않는다", () => {
    expect(swipeLock(5, 4)).toBeNull();
  });
  it("가로로 밀면 탭 밀기, 위아래로 밀면 스크롤", () => {
    expect(swipeLock(-30, 6)).toBe(true);
    expect(swipeLock(10, 40)).toBe(false);
    expect(swipeLock(20, 18)).toBe(false);
  });
  it("미는 쪽의 이웃 탭", () => {
    expect(neighborTab("/", -50)).toBe("/news");
    expect(neighborTab("/", 50)).toBeNull();
    expect(neighborTab("/owner", -50)).toBeNull();
    expect(neighborTab("/stores", -50)).toBeNull();
  });
  it("이웃 탭이 있으면 손가락만큼, 없으면 조금만 끌려온다", () => {
    expect(dragOffset("/news", -80)).toBe(-80);
    expect(dragOffset("/", 100)).toBe(20);
  });
});
