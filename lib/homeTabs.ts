// 홈의 카테고리 탭 (ADR-016, ADR-022): 맨 왼쪽이 전체, 그다음부터 업종 묶음(식당 · 카페·디저트 · 미용 · …).
// 묶음 탭 안에서는 아래로 카테고리마다 나뉜다. 가게 목록 화면(/stores)의 줄은 전체 다음에 카테고리를 하나씩 둔다

import { CATEGORIES, CATEGORY_GROUPS, categoriesInGroup, categoryOf, groupOf, type Category, type CategoryId, type GroupId } from "./categories";
import { latestPerStore } from "./signs";
import type { FeedItem, StoreSign } from "./types";

/** 홈 탭이 되는 묶음 (기타는 탭이 없다) */
export type TabGroupId = Exclude<GroupId, "etc">;
export type HomeTabId = "all" | TabGroupId;
export type ListTabId = "all" | CategoryId;

export const HOME_TABS: { id: HomeTabId; name: string }[] = [{ id: "all", name: "전체" }, ...CATEGORY_GROUPS.map((g) => ({ id: g.id, name: g.name }))];
export const LIST_TABS: { id: ListTabId; name: string }[] = [{ id: "all", name: "전체" }, ...CATEGORIES.map((c) => ({ id: c.id, name: c.name }))];

function neighbor<T extends string>(tabs: { id: T }[], id: T, dir: 1 | -1): T | null {
  const i = tabs.findIndex((t) => t.id === id);
  return i < 0 ? null : (tabs[i + dir]?.id ?? null);
}

export function homeTabName(id: HomeTabId): string {
  return HOME_TABS.find((t) => t.id === id)?.name ?? "전체";
}

/** 옆 탭. dir 1 은 오른쪽(다음), -1 은 왼쪽(이전). 양 끝에서는 null */
export function neighborHomeTab(id: HomeTabId, dir: 1 | -1): HomeTabId | null {
  return neighbor(HOME_TABS, id, dir);
}

/** 가게 목록 화면의 옆 카테고리 */
export function neighborListTab(id: ListTabId, dir: 1 | -1): ListTabId | null {
  return neighbor(LIST_TABS, id, dir);
}

/** from 에서 to 로 갈 때 새 화면이 들어오는 쪽. 오른쪽 탭이면 1, 왼쪽 탭이면 -1, 같은 탭이면 0 */
export function tabDirection(from: HomeTabId, to: HomeTabId): 1 | -1 | 0 {
  const d = HOME_TABS.findIndex((t) => t.id === to) - HOME_TABS.findIndex((t) => t.id === from);
  return d > 0 ? 1 : d < 0 ? -1 : 0;
}

/** 그 탭의 가게. 전체는 모든 가게, 묶음 탭은 그 묶음에 들어가는 가게 */
export function storesInTab<T extends Pick<StoreSign, "category">>(stores: T[], id: HomeTabId): T[] {
  return id === "all" ? stores : stores.filter((s) => groupOf(s.category) === id);
}

/** 묶음 탭 안에서 아래로 나뉘는 구역: 카테고리마다 그 가게들 (가게가 없는 카테고리도 순서대로 들어 있다) */
export function sectionsInTab<T extends Pick<StoreSign, "category">>(stores: T[], id: TabGroupId): { category: Category; stores: T[] }[] {
  return categoriesInGroup(id).map((category) => ({ category, stores: stores.filter((s) => categoryOf(s.category) === category.id) }));
}

/**
 * 그 탭의 "실시간 가게소식": 지금 유효한 글만, 가게마다 가장 새 것 하나, 새로 올라온 순서.
 * 비어 있으면 홈에서 그 칸을 아예 그리지 않는다
 */
export function feedInTab(feed: FeedItem[], stores: Pick<StoreSign, "store_id" | "category">[], id: HomeTabId): FeedItem[] {
  const current = feed.filter((f) => f.is_current);
  if (id === "all") return latestPerStore(current);
  const mine = new Set(storesInTab(stores, id).map((s) => s.store_id));
  return latestPerStore(current.filter((f) => mine.has(f.store_id)));
}
