import { describe, expect, it } from "vitest";
import { CATEGORIES, CATEGORY_GROUPS, categoriesInGroup, categoryOf, groupOf } from "@/lib/categories";

describe("categoryOf", () => {
  it("묶음 이름은 그대로", () => {
    for (const c of CATEGORIES) expect(categoryOf(c.name)).toBe(c.id);
  });

  it("예전 분류와 직접 적은 분류를 묶는다", () => {
    expect(categoryOf("카페·간식")).toBe("cafe");
    expect(categoryOf("식당")).toBe("korean");
    expect(categoryOf("옛날 통닭집")).toBe("chicken");
    expect(categoryOf("꽃집")).toBe("etc");
    expect(categoryOf(null)).toBe("etc");
  });

  it("예전 이름 빵·디저트는 빵집, 떡볶이는 분식, 떡집은 다과, 전자제품은 가전", () => {
    expect(categoryOf("빵·디저트")).toBe("bakery");
    expect(categoryOf("떡볶이")).toBe("bunsik");
    expect(categoryOf("떡집")).toBe("dessert");
    expect(categoryOf("전자제품")).toBe("appliance");
  });
});

describe("카테고리 묶음 (T-CAT-01)", () => {
  it("묶음은 카페·디저트 · 식사 · 생활 · 가전 순서", () => {
    expect(CATEGORY_GROUPS.map((g) => g.name)).toEqual(["카페·디저트", "식사", "생활", "가전"]);
  });

  it("카페·디저트 안에는 카페 · 빵집 · 다과, 식사 안에는 한식부터 치킨·호프까지", () => {
    expect(categoriesInGroup("cafe").map((c) => c.name)).toEqual(["카페", "빵집", "다과"]);
    expect(categoriesInGroup("meal").map((c) => c.name)).toEqual(["한식", "중식", "일식", "양식", "분식", "치킨·호프"]);
    expect(categoriesInGroup("life").map((c) => c.name)).toEqual(["생활·기타"]);
    expect(categoriesInGroup("appliance").map((c) => c.name)).toEqual(["가전"]);
  });

  it("모든 카테고리는 묶음 하나에만 들어 있다", () => {
    expect(CATEGORY_GROUPS.flatMap((g) => categoriesInGroup(g.id)).map((c) => c.id).sort()).toEqual(CATEGORIES.map((c) => c.id).sort());
  });

  it("가게에 적힌 분류로 묶음을 찾는다 (낯선 분류는 생활)", () => {
    expect(groupOf("카페")).toBe("cafe");
    expect(groupOf("베이커리")).toBe("cafe");
    expect(groupOf("국밥")).toBe("meal");
    expect(groupOf("미용")).toBe("life");
    expect(groupOf(null)).toBe("life");
  });
});
