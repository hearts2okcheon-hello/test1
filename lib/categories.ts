// 홈 "무엇을 찾아요?" 묶음. 가게의 category 글자를 이 묶음으로 나눈다

export type CategoryId = "cafe" | "korean" | "chinese" | "japanese" | "western" | "bunsik" | "chicken" | "bakery" | "etc";

export const CATEGORIES: { id: CategoryId; name: string; bg: string; fg: string }[] = [
  { id: "cafe", name: "카페", bg: "#FFE3D3", fg: "#9A4A20" },
  { id: "korean", name: "한식", bg: "#E2F2D8", fg: "#3F6B22" },
  { id: "chinese", name: "중식", bg: "#FFE0E0", fg: "#9A2E2E" },
  { id: "japanese", name: "일식", bg: "#DCEEF7", fg: "#1F5A7A" },
  { id: "western", name: "양식", bg: "#FBE7C6", fg: "#8A5A00" },
  { id: "bunsik", name: "분식", bg: "#FFEFC2", fg: "#8A5A00" },
  { id: "chicken", name: "치킨·호프", bg: "#FCE3C4", fg: "#8A4A0B" },
  { id: "bakery", name: "빵·디저트", bg: "#F1E4D6", fg: "#6E4A2A" },
  { id: "etc", name: "생활·기타", bg: "#E8E2F4", fg: "#4E3F7A" },
];

const KEYWORDS: [CategoryId, RegExp][] = [
  ["bakery", /빵|베이커리|제과|디저트|케이크/],
  ["cafe", /카페|커피|다방|찻집/],
  ["chinese", /중식|중국|반점/],
  ["japanese", /일식|초밥|스시|돈까스/],
  ["western", /양식|파스타|피자|스테이크/],
  ["bunsik", /분식|떡볶이|김밥/],
  ["chicken", /치킨|호프|통닭/],
  ["korean", /한식|식당|백반|국밥|고기/],
];

/** 예전 분류("식당", "카페·간식")나 직접 적은 분류도 묶음 하나로 나눈다 */
export function categoryOf(category: string | null | undefined): CategoryId {
  const text = category?.trim();
  if (!text) return "etc";
  const exact = CATEGORIES.find((c) => c.name === text);
  if (exact) return exact.id;
  return KEYWORDS.find(([, re]) => re.test(text))?.[0] ?? "etc";
}

export function categoryById(id: string | undefined) {
  return CATEGORIES.find((c) => c.id === id);
}
