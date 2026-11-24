import { describe, expect, it } from "vitest";
import { STATUS_FILTERS, STATUS_FILTER_LABEL, filterByStatus, matchesStore, storeStatus } from "@/lib/storeFilter";

const store = (name: string, sign: string, schedule_status: string) => ({ name, sign, schedule_status, category: "카페", neighborhood: null, memo: null }) as never;

describe("가게 목록 상태 고르기 (T-LIST-01)", () => {
  it("펼친 메뉴에는 전체 · 영업중 · 휴무중 · 외출중 순서로 나온다", () => {
    expect(STATUS_FILTERS.map((f) => STATUS_FILTER_LABEL[f])).toEqual(["전체", "영업중", "휴무중", "외출중"]);
  });
  it("외출 팻말이면 외출중, 영업 상태가 open 이면 영업중, 나머지는 휴무중", () => {
    expect(storeStatus({ sign: "out", schedule_status: "open" })).toBe("out");
    expect(storeStatus({ sign: "open", schedule_status: "open" })).toBe("open");
    expect(storeStatus({ sign: "none", schedule_status: "regular_holiday" })).toBe("closed");
    expect(storeStatus({ sign: "none", schedule_status: "unknown" })).toBe("closed");
  });
  it("고른 상태만 남기고, 전체는 문 연 가게가 위", () => {
    const list = [store("쉼", "none", "closed"), store("외출", "out", "closed"), store("열림", "open", "open")];
    expect(filterByStatus(list, "open").map((s: { name: string }) => s.name)).toEqual(["열림"]);
    expect(filterByStatus(list, "out").map((s: { name: string }) => s.name)).toEqual(["외출"]);
    expect(filterByStatus(list, "all").map((s: { name: string }) => s.name)).toEqual(["열림", "외출", "쉼"]);
  });
});

describe("가게 목록 안에서 찾기 (T-LIST-02)", () => {
  const s = { name: "은쑤네 붕어빵", category: "카페", neighborhood: "조치원읍", memo: "팥 다 떨어짐" };
  it("이름·분류·동네·쪽지에서 띄어쓰기 없이 찾는다", () => {
    expect(matchesStore(s, "붕어빵")).toBe(true);
    expect(matchesStore(s, "은쑤네붕어")).toBe(true);
    expect(matchesStore(s, "조치원")).toBe(true);
    expect(matchesStore(s, "팥")).toBe(true);
    expect(matchesStore(s, "치킨")).toBe(false);
    expect(matchesStore(s, "  ")).toBe(true);
  });
});
