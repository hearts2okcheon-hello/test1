import { describe, expect, it } from "vitest";
import { isInternalNav } from "@/lib/nav";

const here = "https://oksori.test/owner";

describe("isInternalNav", () => {
  it("앱 안의 다른 화면이면 true", () => {
    expect(isInternalNav("/admin/login", here)).toBe(true);
    expect(isInternalNav("/owner?tab=a", here)).toBe(true);
  });

  it("같은 화면과 #이동은 false", () => {
    expect(isInternalNav("/owner", here)).toBe(false);
    expect(isInternalNav("/owner#top", here)).toBe(false);
  });

  it("전화·외부 링크는 false", () => {
    expect(isInternalNav("tel:01000000000", here)).toBe(false);
    expect(isInternalNav("https://map.kakao.com/link/search/옥천", here)).toBe(false);
  });
});
