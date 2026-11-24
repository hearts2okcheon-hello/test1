// 가게 업종. 가게의 category 글자를 카테고리 하나로 나누고, 카테고리는 다시 큰 묶음(홈의 탭)에 들어간다 (ADR-022)
// 홈 탭: 전체 · 식당 · 카페·디저트 · 미용 · 생활용품 · 패션 · 의료·건강 · 생활시설 · 식료품
// 한식·중식·분식 같은 음식 업종은 식당 하나로 묶이고, 식당 탭 안에서 아래로 카테고리마다 나뉜다

export type GroupId = "food" | "cafe" | "beauty" | "goods" | "fashion" | "health" | "facility" | "grocery" | "etc";
export type CategoryId =
  | "korean" | "chinese" | "japanese" | "western" | "bunsik" | "chicken"
  | "cafe" | "bakery" | "dessert"
  | "beauty" | "goods" | "fashion" | "health" | "facility" | "grocery" | "etc";
export type Category = { id: CategoryId; name: string; group: GroupId; bg: string; fg: string };

/** 순서가 곧 화면 순서다: 묶음 순서대로, 묶음 안에서는 위에서 아래로 */
export const CATEGORIES: Category[] = [
  { id: "korean", name: "한식", group: "food", bg: "#E2F2D8", fg: "#3F6B22" },
  { id: "chinese", name: "중식", group: "food", bg: "#FFE0E0", fg: "#9A2E2E" },
  { id: "japanese", name: "일식", group: "food", bg: "#DCEEF7", fg: "#1F5A7A" },
  { id: "western", name: "양식", group: "food", bg: "#FBE7C6", fg: "#8A5A00" },
  { id: "bunsik", name: "분식", group: "food", bg: "#FFEFC2", fg: "#8A5A00" },
  { id: "chicken", name: "치킨·호프", group: "food", bg: "#FCE3C4", fg: "#8A4A0B" },
  { id: "cafe", name: "카페", group: "cafe", bg: "#FFE3D3", fg: "#9A4A20" },
  { id: "bakery", name: "빵집", group: "cafe", bg: "#F1E4D6", fg: "#6E4A2A" },
  { id: "dessert", name: "다과", group: "cafe", bg: "#F9E1EA", fg: "#8A3A55" },
  { id: "beauty", name: "미용", group: "beauty", bg: "#F6E1F1", fg: "#7A3A6E" },
  { id: "goods", name: "생활용품", group: "goods", bg: "#DDE9F3", fg: "#2F4F6B" },
  { id: "fashion", name: "패션", group: "fashion", bg: "#E3E6FA", fg: "#3F4A8A" },
  { id: "health", name: "의료·건강", group: "health", bg: "#D9F1EA", fg: "#1F6B5C" },
  { id: "facility", name: "생활시설", group: "facility", bg: "#E8E2F4", fg: "#4E3F7A" },
  { id: "grocery", name: "식료품", group: "grocery", bg: "#E6F3CF", fg: "#4A6B1F" },
  { id: "etc", name: "기타", group: "etc", bg: "#ECE7DD", fg: "#5E5246" },
];

/**
 * 홈 탭이 되는 큰 묶음. icon 은 탭에 그릴 카테고리 그림.
 * 기타(etc)는 여기에 없다: 어느 묶음에도 들지 않는 가게는 전체 탭에서만 보인다
 */
export const CATEGORY_GROUPS: { id: Exclude<GroupId, "etc">; name: string; icon: CategoryId }[] = [
  { id: "food", name: "식당", icon: "korean" },
  { id: "cafe", name: "카페·디저트", icon: "cafe" },
  { id: "beauty", name: "미용", icon: "beauty" },
  { id: "goods", name: "생활용품", icon: "goods" },
  { id: "fashion", name: "패션", icon: "fashion" },
  { id: "health", name: "의료·건강", icon: "health" },
  { id: "facility", name: "생활시설", icon: "facility" },
  { id: "grocery", name: "식료품", icon: "grocery" },
];

// 위에서부터 먼저 맞는 것으로 나눈다 (떡볶이는 분식, 떡집은 다과, 피부과는 의료·건강, 정육점은 식료품)
const KEYWORDS: [CategoryId, RegExp][] = [
  ["bakery", /빵|베이커리|제과/],
  ["bunsik", /분식|떡볶이|김밥/],
  ["dessert", /다과|디저트|케이크|떡|한과|아이스크림|빙수/],
  ["cafe", /카페|커피|다방|찻집/],
  ["chinese", /중식|중국|반점/],
  ["japanese", /일식|초밥|스시|돈까스/],
  ["western", /양식|파스타|피자|스테이크/],
  ["chicken", /치킨|호프|통닭/],
  ["health", /의료|병원|의원|약국|치과|피부과|안경|건강|헬스|요가|필라테스/],
  ["beauty", /미용|헤어|이발|네일|피부|화장품|뷰티/],
  ["fashion", /패션|옷|의류|신발|양복|한복|수선/],
  ["grocery", /식료품|마트|슈퍼|편의점|정육|반찬|과일|채소|청과|수산|방앗간/],
  ["facility", /생활시설|세탁|빨래|목욕|사우나|은행|우체국|주유소|숙박|모텔|학원|독서실|수리|정비|카센터/],
  ["goods", /생활용품|잡화|철물|문구|가전|전자|전파사|컴퓨터|휴대폰|핸드폰|가구|그릇/],
  ["korean", /한식|식당|백반|국밥|고기/],
];

/** 예전 분류("식당", "카페·간식", "빵·디저트", "생활·기타")나 직접 적은 분류도 카테고리 하나로 나눈다 */
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

/** 가게에 적힌 분류가 들어가는 묶음. 어디에도 들지 않으면 etc (탭이 없다) */
export function groupOf(category: string | null | undefined): GroupId {
  return categoryById(categoryOf(category))!.group;
}
