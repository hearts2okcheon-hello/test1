// 홈의 카테고리 탭 (ADR-016): 맨 왼쪽이 전체, 그다음부터 카테고리. 탭마다 올라온 글과 가게를 보여 준다.
// 가게 목록 화면(/stores)의 카테고리 줄도 같은 순서를 쓴다

import { CATEGORIES, categoryOf, type CategoryId } from "./categories";
import { latestPerStore } from "./signs";
import type { FeedItem, StoreSign } from "./types";

export type HomeTabId = "all" | CategoryId;

export const HOME_TABS: { id: HomeTabId; name: string }[] = [{ id: "all", name: "전체" }, ...CATEGORIES.map((c) => ({ id: c.id, name: c.name }))];

export function homeTabName(id: HomeTabId): string {
  return HOME_TABS.find((t) => t.id === id)?.name ?? "전체";
}

/** 옆 탭. dir 1 은 오른쪽(다음), -1 은 왼쪽(이전). 양 끝에서는 null */
export function neighborHomeTab(id: HomeTabId, dir: 1 | -1): HomeTabId | null {
  const i = HOME_TABS.findIndex((t) => t.id === id);
  return i < 0 ? null : (HOME_TABS[i + dir]?.id ?? null);
}

/** from 에서 to 로 갈 때 새 화면이 들어오는 쪽. 오른쪽 탭이면 1, 왼쪽 탭이면 -1, 같은 탭이면 0 */
export function tabDirection(from: HomeTabId, to: HomeTabId): 1 | -1 | 0 {
  const d = HOME_TABS.findIndex((t) => t.id === to) - HOME_TABS.findIndex((t) => t.id === from);
  return d > 0 ? 1 : d < 0 ? -1 : 0;
}

/** 그 탭의 가게. 전체는 모든 가게 */
export function storesInTab<T extends Pick<StoreSign, "category">>(stores: T[], id: HomeTabId): T[] {
  return id === "all" ? stores : stores.filter((s) => categoryOf(s.category) === id);
}

/** 그 탭에 올라온 글: 지금 유효한 것만, 가게마다 가장 새 것 하나, 새로 올라온 순서 */
export function feedInTab(feed: FeedItem[], stores: Pick<StoreSign, "store_id" | "category">[], id: HomeTabId): FeedItem[] {
  const current = feed.filter((f) => f.is_current);
  if (id === "all") return latestPerStore(current);
  const mine = new Set(storesInTab(stores, id).map((s) => s.store_id));
  return latestPerStore(current.filter((f) => mine.has(f.store_id)));
}
