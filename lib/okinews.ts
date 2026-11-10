// 옥천신문 주요 뉴스. 사이트에 "오늘 많이 본 기사" 목록이 없어서
// 1면 맨 위에 편집국이 올린 기사를 쓰고, 요약은 공식 RSS 에서 가져온다 (ADR-012)

const SITE = "https://www.okinews.com";
const IMAGE_HOST = "https://cdn.okinews.com/";
const REVALIDATE_SECONDS = 1800;

/** comments: 옥천신문 기사에 달린 댓글 수. 조회수·공감은 옥천신문이 공개하지 않아 가져올 수 없다 */
export type NewsItem = { id: string; url: string; title: string; image: string | null; summary: string | null; publishedAt: string | null; comments?: number | null };

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

function articleUrl(id: string) {
  return `${SITE}/news/articleView.html?idxno=${id}`;
}

/** 1면 맨 위 기사 묶음(#skin-1)에서 제목·사진을 뽑는다 */
export function parseFrontPage(html: string): { id: string; title: string; image: string | null; summary: string | null }[] {
  const start = html.indexOf('id="skin-1"');
  if (start < 0) return [];
  const chunks = html.slice(start).split(/<div class="item /).slice(1, 6);
  const out: { id: string; title: string; image: string | null; summary: string | null }[] = [];
  for (const chunk of chunks) {
    const id = chunk.match(/articleView\.html\?idxno=(\d+)/)?.[1];
    const title = chunk.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1];
    if (!id || !title || out.some((a) => a.id === id)) continue;
    const image = chunk.match(/background-image:\s*url\('([^']+)'\)/)?.[1] ?? null;
    const summary = chunk.match(/auto-sums[^>]*>([\s\S]*?)<\/div>/)?.[1];
    out.push({ id, title: decodeHtml(title), image: image?.startsWith(IMAGE_HOST) ? image : null, summary: summary ? decodeHtml(summary) : null });
  }
  return out;
}

/** 공식 RSS 의 최신 기사 */
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
      return [{ id, title: decodeHtml(title), summary: description ? decodeHtml(description) : null, publishedAt: pick("pubDate")?.trim() ?? null }];
    });
}

/** 1면 기사 우선, 모자라면 최신 기사로 채운다. 사이트가 안 열리면 빈 목록 */
export function mergeNews(front: ReturnType<typeof parseFrontPage>, rss: ReturnType<typeof parseRss>, count = 3): NewsItem[] {
  const byId = new Map(rss.map((r) => [r.id, r]));
  const fromFront = front.map((f): NewsItem => ({ id: f.id, url: articleUrl(f.id), title: f.title, image: f.image, summary: f.summary ?? byId.get(f.id)?.summary ?? null, publishedAt: byId.get(f.id)?.publishedAt ?? null }));
  const rest = rss.filter((r) => !front.some((f) => f.id === r.id)).map((r): NewsItem => ({ id: r.id, url: articleUrl(r.id), title: r.title, image: null, summary: r.summary, publishedAt: r.publishedAt }));
  return [...fromFront, ...rest].slice(0, count);
}

/** 기사 정보 줄(기자명 · 입력 · 호수 · 댓글 N)에서 댓글 수 */
export function parseCommentCount(html: string): number | null {
  const n = html.match(/<li>\s*댓글\s*(\d+)\s*<\/li>/)?.[1];
  return n === undefined ? null : Number(n);
}

async function fetchText(path: string): Promise<string> {
  try {
    const res = await fetch(`${SITE}${path}`, { next: { revalidate: REVALIDATE_SECONDS }, headers: { "User-Agent": "Mozilla/5.0 (compatible; oksori)" }, signal: AbortSignal.timeout(6000) });
    return res.ok ? await res.text() : "";
  } catch {
    return "";
  }
}

export async function getTopNews(): Promise<NewsItem[]> {
  const [html, xml] = await Promise.all([fetchText("/"), fetchText("/rss/allArticle.xml")]);
  const news = mergeNews(parseFrontPage(html), parseRss(xml));
  const pages = await Promise.all(news.map((n) => fetchText(`/news/articleView.html?idxno=${n.id}`)));
  return news.map((n, i) => ({ ...n, comments: parseCommentCount(pages[i]) }));
}
