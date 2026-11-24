// 가게 소식의 순서와 "더 보기" (ADR-024): 공지는 맨 위에 따로(옆으로 넘겨 본다), 소식은 그 아래에. 둘 다 새 글이 먼저
// 글 화면의 주소와 글마다 붙는 점 세 개 메뉴 (ADR-025)

/** 공지도 소식도 처음에는 이만큼만 보여 주고, 더 있으면 "더 보기"를 둔다 */
export const POST_PAGE = 3;

/** 공지와 소식으로 나눈다. 각각 새로 올린 글이 먼저 */
export function splitPosts<T extends { kind: "news" | "notice"; created_at: string }>(posts: T[]): { notices: T[]; news: T[] } {
  const latestFirst = [...posts].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return { notices: latestFirst.filter((p) => p.kind === "notice"), news: latestFirst.filter((p) => p.kind === "news") };
}

/** 처음에는 page 개만. expanded(더 보기를 누름)면 모두. more 는 아직 보여 주지 않은 수 */
export function firstPage<T>(items: T[], expanded: boolean, page: number = POST_PAGE): { shown: T[]; more: number } {
  if (expanded || items.length <= page) return { shown: items, more: 0 };
  return { shown: items.slice(0, page), more: items.length - page };
}

/** 사장님 소식 글 하나의 화면 */
export const postHref = (storeId: string, postId: string) => `/stores/${storeId}/posts/${postId}`;
/** 사장님 소식 글을 고치는 화면 */
export const postEditHref = (storeId: string, postId: string) => `${postHref(storeId, postId)}/edit`;
/** 동네 이야기 글 하나의 화면 */
export const storyHref = (id: string) => `/news/${id}`;
/** 동네 이야기 글을 고치는 화면 */
export const storyEditHref = (id: string) => `${storyHref(id)}/edit`;

/**
 * 소통광장·홈의 사장님 소식 한 줄을 누르면 갈 곳: 사장님이 쓴 글(소식·공지)은 그 글 화면으로.
 * 팻말 알림(외출 중 …)과 임시휴무는 따로 글이 없으니 가게 화면으로 간다
 */
export function feedHref(f: { item_type: "notice" | "post" | "closure"; store_id: string; item_id: string }): string {
  return f.item_type === "post" ? postHref(f.store_id, f.item_id) : `/stores/${f.store_id}`;
}

export type PostAction = "edit" | "delete";

/**
 * 글 오른쪽 위 점 세 개(⋮) 메뉴에 들어가는 것: 내가 쓴 글이면 수정·삭제,
 * 관리자는 남의 글도 지울 수만 있고, 그 밖의 사람에게는 메뉴가 없다. (마지막 권한 검사는 RPC 가 다시 한다)
 */
export function postActions({ mine, admin = false }: { mine: boolean; admin?: boolean }): PostAction[] {
  if (mine) return ["edit", "delete"];
  return admin ? ["delete"] : [];
}
