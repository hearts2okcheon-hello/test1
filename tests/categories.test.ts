import { describe, expect, it } from "vitest";
import { CATEGORIES, categoryOf } from "@/lib/categories";

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
});
