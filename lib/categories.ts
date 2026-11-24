// 가게 분류. 가게의 category 글자를 카테고리 하나로 나누고, 카테고리는 다시 큰 묶음(홈의 탭)에 들어간다 (ADR-017)
// 홈: 전체 · 카페·디저트 · 식사 · 생활 · 가전. 묶음 탭 안에서는 아래로 카테고리마다 나뉜다 (카페 → 빵집 → 다과)

export type GroupId = "cafe" | "meal" | "life" | "appliance";
export type CategoryId = "cafe" | "bakery" | "dessert" | "korean" | "chinese" | "japanese" | "western" | "bunsik" | "chicken" | "etc" | "appliance";
export type Category = { id: CategoryId; name: string; group: GroupId; bg: string; fg: string };

/** 순서가 곧 화면 순서다: 묶음 순서대로, 묶음 안에서는 위에서 아래로 */
export const CATEGORIES: Category[] = [
  { id: "cafe", name: "카페", group: "cafe", bg: "#FFE3D3", fg: "#9A4A20" },
  { id: "bakery", name: "빵집", group: "cafe", bg: "#F1E4D6", fg: "#6E4A2A" },
  { id: "dessert", name: "다과", group: "cafe", bg: "#F9E1EA", fg: "#8A3A55" },
  { id: "korean", name: "한식", group: "meal", bg: "#E2F2D8", fg: "#3F6B22" },
  { id: "chinese", name: "중식", group: "meal", bg: "#FFE0E0", fg: "#9A2E2E" },
  { id: "japanese", name: "일식", group: "meal", bg: "#DCEEF7", fg: "#1F5A7A" },
  { id: "western", name: "양식", group: "meal", bg: "#FBE7C6", fg: "#8A5A00" },
  { id: "bunsik", name: "분식", group: "meal", bg: "#FFEFC2", fg: "#8A5A00" },
  { id: "chicken", name: "치킨·호프", group: "meal", bg: "#FCE3C4", fg: "#8A4A0B" },
  { id: "etc", name: "생활·기타", group: "life", bg: "#E8E2F4", fg: "#4E3F7A" },
  { id: "appliance", name: "가전", group: "appliance", bg: "#DDE9F3", fg: "#2F4F6B" },
];

/** 홈 탭이 되는 큰 묶음. icon 은 탭에 그릴 카테고리 그림 */
export const CATEGORY_GROUPS: { id: GroupId; name: string; icon: CategoryId }[] = [
  { id: "cafe", name: "카페·디저트", icon: "cafe" },
  { id: "meal", name: "식사", icon: "korean" },
  { id: "life", name: "생활", icon: "etc" },
  { id: "appliance", name: "가전", icon: "appliance" },
];

// 위에서부터 먼저 맞는 것으로 나눈다 (떡볶이는 분식, 떡집은 다과)
const KEYWORDS: [CategoryId, RegExp][] = [
  ["bakery", /빵|베이커리|제과/],
  ["bunsik", /분식|떡볶이|김밥/],
  ["dessert", /다과|디저트|케이크|떡|한과|아이스크림|빙수/],
  ["cafe", /카페|커피|다방|찻집/],
  ["chinese", /중식|중국|반점/],
  ["japanese", /일식|초밥|스시|돈까스/],
  ["western", /양식|파스타|피자|스테이크/],
  ["chicken", /치킨|호프|통닭/],
  ["appliance", /가전|전자|전파사|컴퓨터|휴대폰|핸드폰/],
  ["korean", /한식|식당|백반|국밥|고기/],
];

/** 예전 분류("식당", "카페·간식", "빵·디저트")나 직접 적은 분류도 카테고리 하나로 나눈다 */
export function categoryOf(category: string | null | undefined): CategoryId {
  const text = category?.trim();
  if (!text) return "etc";
  const exact = CATEGORIES.find((c) => c.name === text);
  if (exact) return exact.id;
  return KEYWORDS.find(([, re]) => re.test(text))?.[0] ?? "etc";
}

export function categoryById(id: string | undefined): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

/** 묶음 안의 카테고리 (화면에 나오는 순서) */
export function categoriesInGroup(group: GroupId): Category[] {
  return CATEGORIES.filter((c) => c.group === group);
}

/** 가게에 적힌 분류가 들어가는 묶음 */
export function groupOf(category: string | null | undefined): GroupId {
  return categoryById(categoryOf(category))!.group;
}
