import { describe, expect, it } from "vitest";
import { CATEGORIES, CATEGORY_GROUPS, categoriesInGroup, categoryOf, groupOf } from "@/lib/categories";

describe("categoryOf", () => {
  it("카테고리 이름은 그대로", () => {
    for (const c of CATEGORIES) expect(categoryOf(c.name)).toBe(c.id);
  });

  it("예전 분류와 직접 적은 음식 분류를 나눈다", () => {
    expect(categoryOf("카페·간식")).toBe("cafe");
    expect(categoryOf("식당")).toBe("korean");
    expect(categoryOf("옛날 통닭집")).toBe("chicken");
    expect(categoryOf("빵·디저트")).toBe("bakery");
    expect(categoryOf("떡볶이")).toBe("bunsik");
    expect(categoryOf("떡집")).toBe("dessert");
  });

  it("직접 적은 생활 업종도 나눈다", () => {
    expect(categoryOf("미용실")).toBe("beauty");
    expect(categoryOf("헤어샵")).toBe("beauty");
    expect(categoryOf("약국")).toBe("health");
    expect(categoryOf("한의원")).toBe("health");
    expect(categoryOf("피부과")).toBe("health");
    expect(categoryOf("옷가게")).toBe("fashion");
    expect(categoryOf("세탁소")).toBe("facility");
    expect(categoryOf("하나로마트")).toBe("grocery");
    expect(categoryOf("정육점")).toBe("grocery");
    expect(categoryOf("철물점")).toBe("goods");
    expect(categoryOf("가전")).toBe("goods");
  });

  it("어디에도 들지 않으면 기타", () => {
    expect(categoryOf("꽃집")).toBe("etc");
    expect(categoryOf("생활·기타")).toBe("etc");
    expect(categoryOf(null)).toBe("etc");
  });
});

describe("업종 묶음 (T-CAT-01)", () => {
  it("홈 탭이 되는 묶음: 식당 · 카페·디저트 · 미용 · 생활용품 · 패션 · 의료·건강 · 생활시설 · 식료품", () => {
    expect(CATEGORY_GROUPS.map((g) => g.name)).toEqual(["식당", "카페·디저트", "미용", "생활용품", "패션", "의료·건강", "생활시설", "식료품"]);
  });

  it("한식·중식·분식 같은 음식 업종은 식당 하나로 묶인다", () => {
    expect(categoriesInGroup("food").map((c) => c.name)).toEqual(["한식", "중식", "일식", "양식", "분식", "치킨·호프"]);
    expect(categoriesInGroup("cafe").map((c) => c.name)).toEqual(["카페", "빵집", "다과"]);
  });

  it("새로 더한 생활 업종은 묶음과 카테고리가 같다", () => {
    for (const [group, name] of [["beauty", "미용"], ["goods", "생활용품"], ["fashion", "패션"], ["health", "의료·건강"], ["facility", "생활시설"], ["grocery", "식료품"]] as const) {
      expect(categoriesInGroup(group).map((c) => c.name)).toEqual([name]);
    }
  });

  it("모든 카테고리는 묶음 하나에만 들어 있다 (기타는 탭이 없는 묶음)", () => {
    const grouped = [...CATEGORY_GROUPS.map((g) => g.id), "etc" as const].flatMap((g) => categoriesInGroup(g)).map((c) => c.id);
    expect(grouped.sort()).toEqual(CATEGORIES.map((c) => c.id).sort());
    expect(categoriesInGroup("etc").map((c) => c.name)).toEqual(["기타"]);
  });

  it("가게에 적힌 분류로 묶음을 찾는다", () => {
    expect(groupOf("한식")).toBe("food");
    expect(groupOf("중식")).toBe("food");
    expect(groupOf("분식")).toBe("food");
    expect(groupOf("카페")).toBe("cafe");
    expect(groupOf("미용")).toBe("beauty");
    expect(groupOf("꽃집")).toBe("etc");
    expect(groupOf(null)).toBe("etc");
  });
});
