import type { StoreSign } from "./types";

/** 가게 목록의 상태 고르기. 버튼을 누르면 이 순서로 아래에 펼쳐진다 (components/StatusSelect) */
export const STATUS_FILTERS = ["all", "open", "closed", "out"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export const STATUS_FILTER_LABEL: Record<StatusFilter, string> = { all: "전체", open: "영업중", closed: "휴무중", out: "외출중" };

/** 가게가 지금 어느 묶음인가. 외출 팻말이 걸려 있으면 외출중, 영업 상태가 open 이면 영업중, 나머지는 휴무중 */
export function storeStatus(s: Pick<StoreSign, "sign" | "schedule_status">): Exclude<StatusFilter, "all"> {
  if (s.sign === "out") return "out";
  return s.schedule_status === "open" ? "open" : "closed";
}

/** 고른 상태의 가게만. 전체일 때는 문 연 가게를 위로 올린다 */
export function filterByStatus<T extends Pick<StoreSign, "sign" | "schedule_status">>(stores: T[], f: StatusFilter): T[] {
  if (f !== "all") return stores.filter((s) => storeStatus(s) === f);
  const rank = { open: 0, out: 1, closed: 2 };
  return [...stores].sort((a, b) => rank[storeStatus(a)] - rank[storeStatus(b)]);
}

/** 가게 이름·분류·동네·쪽지에서 찾는다 (띄어쓰기는 무시) */
export function matchesStore(s: Pick<StoreSign, "name" | "category" | "neighborhood" | "memo">, q: string): boolean {
  const needle = q.replace(/\s/g, "");
  if (!needle) return true;
  return [s.name, s.category, s.neighborhood, s.memo].some((v) => (v ?? "").replace(/\s/g, "").includes(needle));
}
