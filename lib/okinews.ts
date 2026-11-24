// 옥천신문 최근 기사 (ADR-018). 공식 RSS 에는 일부 기사만 드물게 올라와서,
// 사이트의 기사 목록(가장 새 기사 20개)을 읽고 기사마다 요약·올라온 시각·댓글 수를 기사 화면에서 가져온다.
// 소통광장에는 최근 NEWS_DAYS 일 안에 올라온 기사만 보여 준다

import { articleUrl } from "./storeArticles";

const SITE = "https://www.okinews.com";
const IMAGE_HOST = "https://cdn.okinews.com/";
const REVALIDATE_SECONDS = 1800;
const DAY_MS = 86_400_000;
const KST_MS = 9 * 3_600_000;

/** 며칠 전 기사까지 보여 줄지 */
export const NEWS_DAYS = 5;
/** 한 번에 다루는 기사 수. 기사 목록 한 쪽의 수이고, get_news_stats 가 한 번에 세는 수와 같다 */
export const NEWS_MAX = 20;

/** comments: 옥천신문 기사에 달린 댓글 수. 조회수·공감은 옥천신문이 공개하지 않아 가져올 수 없다 */
export type NewsItem = { id: string; url: string; title: string; image: string | null; summary: string | null; publishedAt: string | null; comments?: number | null };
export type ListedArticle = { id: string; title: string; section: string | null; date: string | null };
export type ArticleMeta = { summary: string | null; image: string | null; publishedAt: string | null; comments?: number | null };

function decodeHtml(text: string): string {
  return text
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&middot;/g, "·")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** 기사 목록 화면(#section-list)에서 기사 번호·제목·분야·날짜("11-24 07:46")를 뽑는다 */
export function parseArticleList(html: string): ListedArticle[] {
  const start = html.indexOf('id="section-list"');
  if (start < 0) return [];
  const out: ListedArticle[] = [];
  for (const chunk of html.slice(start).split('<li class="altlist-text-item">').slice(1)) {
    // 한 줄(</li> 앞)만 본다. 그 뒤에는 다른 목록의 기사 링크가 이어진다
    const row = chunk.split("</li>")[0];
    const link = row.match(/<a [^>]*articleView\.html\?idxno=(\d+)[^>]*>([\s\S]*?)<\/a>/);
    if (!link || out.some((a) => a.id === link[1])) continue;
    const title = decodeHtml(link[2]);
    if (!title) continue;
    const info = [...row.matchAll(/altlist-info-item">([^<]*)</g)].map((m) => decodeHtml(m[1]));
    const date = info.find((v) => /^\d{2}-\d{2} \d{2}:\d{2}$/.test(v)) ?? null;
    out.push({ id: link[1], title, section: info[0] && info[0] !== date ? info[0] : null, date });
  }
  return out;
}

/** 기사 화면의 머리 정보에서 요약(og:description)·사진·올라온 시각을 읽는다 */
export function parseArticleMeta(html: string): { summary: string | null; image: string | null; publishedAt: string | null } {
  const meta = (key: string) => html.match(new RegExp(`<meta[^>]+property="${key}"[^>]*content="([^"]*)"`))?.[1] ?? null;
  const summary = meta("og:description");
  const image = meta("og:image");
  const at = meta("article:published_time");
  return {
    summary: summary ? decodeHtml(summary) || null : null,
    image: image?.startsWith(IMAGE_HOST) ? image : null,
    publishedAt: at && !Number.isNaN(Date.parse(at)) ? at : null,
  };
}

/** 기사 화면의 제목(og:title). 끝에 붙는 " - 옥천신문"은 뗀다. 없는 기사면 null */
export function parseArticleTitle(html: string): string | null {
  const raw = html.match(/<meta[^>]+property="og:title"[^>]*content="([^"]*)"/)?.[1];
  const title = raw ? decodeHtml(raw).replace(/\s*-\s*옥천신문$/, "") : "";
  return title || null;
}

/** "2026-11-20 13:11:59" 처럼 시간대가 없는 시각은 서울 시각이다 */
function seoulIso(text: string | undefined): string | null {
  const m = text?.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/);
  return m ? `${m[1]}T${m[2]}+09:00` : null;
}

/** 공식 RSS 의 기사. 요약이 기사 화면의 것보다 길다 */
export function parseRss(xml: string): { id: string; title: string; summary: string | null; publishedAt: string | null }[] {
  return xml
    .split("<item>")
    .slice(1)
    .flatMap((item) => {
      const pick = (tag: string) => item.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1];
      const id = pick("link")?.match(/idxno=(\d+)/)?.[1];
      const title = pick("title");
      if (!id || !title) return [];
      const description = pick("description");
      return [{ id, title: decodeHtml(title), summary: description ? decodeHtml(description) : null, publishedAt: seoulIso(pick("pubDate")) }];
    });
}

/** 기사 정보 줄(기자명 · 입력 · 호수 · 댓글 N)에서 댓글 수 */
export function parseCommentCount(html: string): number | null {
  const n = html.match(/<li>\s*댓글\s*(\d+)\s*<\/li>/)?.[1];
  return n === undefined ? null : Number(n);
}

/** 목록의 "11-24 07:46" 을 날짜로. 연도가 적혀 있지 않아서, 올해로 읽으면 앞날이 되는 것은 지난해로 본다 */
export function listDate(md: string | null, now: Date): string | null {
  const m = md?.match(/^(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!m) return null;
  const year = new Date(now.getTime() + KST_MS).getUTCFullYear();
  const iso = (y: number) => `${y}-${m[1]}-${m[2]}T${m[3]}:${m[4]}:00+09:00`;
  const t = Date.parse(iso(year));
  if (Number.isNaN(t)) return null;
  return t - now.getTime() > DAY_MS ? iso(year - 1) : iso(year);
}

/** 오늘(서울)에서 days 일 전 날짜의 0시 */
function windowStart(now: Date, days: number): number {
  const todayStart = Math.floor((now.getTime() + KST_MS) / DAY_MS) * DAY_MS - KST_MS;
  return todayStart - days * DAY_MS;
}

/** 최근 days 일 안에 올라온 기사만, 새 순서로. 날짜를 모르는 기사는 뺀다 */
export function recentNews<T extends { publishedAt: string | null }>(items: T[], now: Date, days = NEWS_DAYS): T[] {
  const from = windowStart(now, days);
  const at = (n: T) => (n.publishedAt ? Date.parse(n.publishedAt) : NaN);
  return items.filter((n) => at(n) >= from).sort((a, b) => at(b) - at(a));
}

/**
 * 기사 목록에 기사마다의 정보를 합친다. metas[i] 는 list[i] 의 기사 화면에서 읽은 것(못 읽었으면 undefined).
 * 요약은 RSS(더 길다)가 있으면 그것을, 날짜는 기사 화면의 것을 먼저 쓴다
 */
export function buildNews(list: ListedArticle[], metas: (ArticleMeta | undefined)[], rss: ReturnType<typeof parseRss>, now: Date): NewsItem[] {
  const byId = new Map(rss.map((r) => [r.id, r]));
  return list.map((a, i): NewsItem => {
    const meta = metas[i];
    const fromRss = byId.get(a.id);
    return {
      id: a.id,
      url: articleUrl(a.id),
      title: a.title,
      image: meta?.image ?? null,
      summary: fromRss?.summary ?? meta?.summary ?? null,
      publishedAt: meta?.publishedAt ?? fromRss?.publishedAt ?? listDate(a.date, now),
      comments: meta?.comments ?? null,
    };
  });
}

async function fetchText(path: string): Promise<string> {
  try {
    const res = await fetch(`${SITE}${path}`, { next: { revalidate: REVALIDATE_SECONDS }, headers: { "User-Agent": "Mozilla/5.0 (compatible; oksori)" }, signal: AbortSignal.timeout(6000) });
    return res.ok ? await res.text() : "";
  } catch {
    return "";
  }
}

/** 기사 하나의 제목·사진·올라온 시각 (가게에 기사를 붙일 때 쓴다, ADR-020). 없는 기사이거나 못 읽으면 null */
export async function getArticle(id: string): Promise<{ id: string; title: string; image: string | null; publishedAt: string | null } | null> {
  if (!/^\d{1,12}$/.test(id)) return null;
  const page = await fetchText(`/news/articleView.html?idxno=${id}`);
  const title = parseArticleTitle(page);
  if (!title) return null;
  const { image, publishedAt } = parseArticleMeta(page);
  return { id, title, image, publishedAt };
}

/** 옥천신문 사이트에 한꺼번에 몰리지 않게 limit 개씩만 부른다 */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

/**
 * 최근 NEWS_DAYS 일 안에 올라온 옥천신문 기사 (새 순서, NEWS_MAX 개까지).
 * loaded 가 false 면 사이트를 읽지 못한 것이다 (기사가 없는 것과 구별한다)
 */
export async function getRecentNews(now: Date = new Date()): Promise<{ news: NewsItem[]; loaded: boolean }> {
  const [html, xml] = await Promise.all([fetchText("/news/articleList.html"), fetchText("/rss/allArticle.xml")]);
  const rss = parseRss(xml);
  const listed = parseArticleList(html);

  if (listed.length === 0) {
    // 기사 목록을 못 읽으면 RSS 로 대신한다
    const items = rss.map((r): NewsItem => ({ id: r.id, url: articleUrl(r.id), title: r.title, image: null, summary: r.summary, publishedAt: r.publishedAt, comments: null }));
    return { news: recentNews(items, now).slice(0, NEWS_MAX), loaded: rss.length > 0 };
  }

  // 목록의 날짜로 봐도 이미 지난 기사는 기사 화면을 읽지 않는다
  const from = windowStart(now, NEWS_DAYS);
  const list = listed.slice(0, NEWS_MAX).filter((a) => {
    const at = listDate(a.date, now);
    return !at || Date.parse(at) >= from;
  });

  const metas = await mapLimit(list, 5, async (a): Promise<ArticleMeta | undefined> => {
    const page = await fetchText(`/news/articleView.html?idxno=${a.id}`);
    return page ? { ...parseArticleMeta(page), comments: parseCommentCount(page) } : undefined;
  });
  return { news: recentNews(buildNews(list, metas, rss, now), now), loaded: true };
}
