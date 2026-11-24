import { describe, expect, it } from "vitest";
import { HOME_TABS, LIST_TABS, favoriteFeed, neighborHomeTab, neighborListTab, sectionsInTab, storesInTab, tabDirection } from "@/lib/homeTabs";
import { innerPagerTakes, setInnerPager, shouldCommitSwipe } from "@/lib/swipe";
import type { FeedItem, StoreSign } from "@/lib/types";

const store = (id: string, category: string) => ({ store_id: id, name: id, category }) as StoreSign;
const item = (id: string, storeId: string, at: string, current = true) =>
  ({ item_id: id, item_type: "post", store_id: storeId, store_name: storeId, created_at: at, is_current: current }) as FeedItem;

const STORES = [store("붕어빵", "카페"), store("가든", "한식"), store("미용실", "미용"), store("빵굽는집", "빵집"), store("커피집", "카페")];
const FEED = [
  item("a", "붕어빵", "2026-11-19T09:00:00Z"),
  item("b", "붕어빵", "2026-11-19T11:00:00Z"),
  item("c", "가든", "2026-11-19T10:00:00Z"),
  item("d", "미용실", "2026-11-19T12:00:00Z", false),
];

describe("홈 카테고리 탭 (T-HOME-01)", () => {
  it("맨 왼쪽이 전체, 그다음부터 묶음 순서", () => {
    expect(HOME_TABS.map((t) => t.name)).toEqual(["전체", "카페·디저트", "식사", "생활", "가전"]);
  });
  it("옆 탭: 전체 다음은 카페·디저트, 양 끝에서는 더 없다", () => {
    expect(neighborHomeTab("all", 1)).toBe("cafe");
    expect(neighborHomeTab("cafe", -1)).toBe("all");
    expect(neighborHomeTab("all", -1)).toBeNull();
    expect(neighborHomeTab("appliance", 1)).toBeNull();
  });
  it("새 화면이 들어오는 쪽: 오른쪽 탭으로 가면 1, 왼쪽이면 -1", () => {
    expect(tabDirection("all", "meal")).toBe(1);
    expect(tabDirection("meal", "all")).toBe(-1);
    expect(tabDirection("cafe", "cafe")).toBe(0);
  });
  it("가게 목록 화면의 줄은 전체 다음에 카테고리를 하나씩 (묶음 순서대로)", () => {
    expect(LIST_TABS.map((t) => t.name)).toEqual(["전체", "카페", "빵집", "다과", "한식", "중식", "일식", "양식", "분식", "치킨·호프", "생활·기타", "가전"]);
    expect(neighborListTab("all", 1)).toBe("cafe");
    expect(neighborListTab("dessert", 1)).toBe("korean");
    expect(neighborListTab("appliance", 1)).toBeNull();
  });
});

describe("탭마다 보이는 가게 (T-HOME-02)", () => {
  it("전체는 모든 가게, 묶음 탭은 그 묶음의 가게만 (분류가 낯설면 생활)", () => {
    expect(storesInTab(STORES, "all")).toHaveLength(5);
    expect(storesInTab(STORES, "cafe").map((s) => s.store_id)).toEqual(["붕어빵", "빵굽는집", "커피집"]);
    expect(storesInTab(STORES, "life").map((s) => s.store_id)).toEqual(["미용실"]);
    expect(storesInTab(STORES, "appliance")).toEqual([]);
  });
  it("묶음 탭은 아래로 카테고리마다 나뉜다: 카페 · 빵집 · 다과 (가게가 없는 카테고리도 자리는 있다)", () => {
    const sections = sectionsInTab(STORES, "cafe");
    expect(sections.map((s) => s.category.name)).toEqual(["카페", "빵집", "다과"]);
    expect(sections.map((s) => s.stores.map((x) => x.store_id))).toEqual([["붕어빵", "커피집"], ["빵굽는집"], []]);
  });
});

describe("즐겨찾는 가게 소식 (T-HOME-04)", () => {
  it("즐겨찾는 가게가 올린 지금 유효한 글만, 가게마다 가장 새 것 하나, 새 순서", () => {
    expect(favoriteFeed(FEED, ["붕어빵", "가든", "미용실"]).map((f) => f.item_id)).toEqual(["b", "c"]);
    expect(favoriteFeed(FEED, new Set(["가든"])).map((f) => f.item_id)).toEqual(["c"]);
  });
  it("즐겨찾는 가게가 없거나 글이 없으면 비어 있다", () => {
    expect(favoriteFeed(FEED, [])).toEqual([]);
    expect(favoriteFeed(FEED, ["커피집"])).toEqual([]);
  });
});

describe("옆으로 밀어 넘기기 (T-HOME-03)", () => {
  it("70px 넘게 밀면 넘긴다", () => {
    expect(shouldCommitSwipe(-80, 0, 375)).toBe(true);
    expect(shouldCommitSwipe(40, 0, 375)).toBe(false);
  });
  it("조금 밀어도 같은 쪽으로 빠르게 튕기면 넘긴다. 반대쪽으로 튕기면 넘기지 않는다", () => {
    expect(shouldCommitSwipe(-30, -0.8, 375)).toBe(true);
    expect(shouldCommitSwipe(-30, 0.8, 375)).toBe(false);
    expect(shouldCommitSwipe(-10, -0.8, 375)).toBe(false);
  });
  it("홈에 넘길 카테고리가 있으면 탭 밀기는 양보한다", () => {
    expect(innerPagerTakes(-50)).toBe(false);
    setInnerPager((dx) => dx < 0);
    expect(innerPagerTakes(-50)).toBe(true);
    expect(innerPagerTakes(50)).toBe(false);
    setInnerPager(null);
    expect(innerPagerTakes(-50)).toBe(false);
  });
});
