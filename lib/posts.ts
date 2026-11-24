// 가게 소식의 순서와 "더 보기" (ADR-024): 공지는 맨 위에 따로(옆으로 넘겨 본다), 소식은 그 아래에. 둘 다 새 글이 먼저

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
