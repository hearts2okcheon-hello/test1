// 가게에 붙인 옥천신문 기사 (ADR-020). 화면에서도 쓰는 가벼운 도구만 둔다 (기사 화면을 읽는 일은 lib/okinews.ts)

import type { StoreArticle } from "./types";

const SITE = "https://www.okinews.com";

export function articleUrl(id: string): string {
  return `${SITE}/news/articleView.html?idxno=${id}`;
}

/**
 * 관리자가 붙여 넣은 글에서 기사 번호를 읽는다.
 * 옥천신문 기사 주소(…articleView.html?idxno=숫자)이거나 번호만 적은 것만 받는다
 */
export function articleIdFrom(input: string): string | null {
  const text = input.trim();
  if (/^\d{1,12}$/.test(text)) return text;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (!/(^|\.)okinews\.com$/i.test(url.hostname)) return null;
  const id = url.searchParams.get("idxno");
  return id && /^\d{1,12}$/.test(id) ? id : null;
}

/** 가게마다 묶는다. 받은 순서(새로 올라온 기사가 먼저)를 그대로 둔다 */
export function articlesByStore(rows: StoreArticle[]): Record<string, StoreArticle[]> {
  const map: Record<string, StoreArticle[]> = {};
  for (const row of rows) (map[row.store_id] ??= []).push(row);
  return map;
}

/** 기사가 올라온 날 (서울 날짜). 가게 기사는 오래된 것도 있어서 연도까지 보여 준다 */
export function articleDate(iso: string | null): string | null {
  const t = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(t)) return null;
  const d = new Date(t + 9 * 3_600_000);
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}
