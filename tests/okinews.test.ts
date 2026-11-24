import { describe, expect, it } from "vitest";
import { buildNews, listDate, parseArticleList, parseArticleMeta, parseCommentCount, parseRss, recentNews } from "@/lib/okinews";

const item = (id: string, title: string, date: string) => `<li class="altlist-text-item">
  <div class="altlist-text-group"><H2 class="altlist-subject">
    <a href="https://www.okinews.com/news/articleView.html?idxno=${id}" target="_top">
      ${title}
    </a></H2></div>
  <div class="altlist-info"><div class="altlist-info-item">사회일반</div><div class="altlist-info-item">홍길동 기자</div><div class="altlist-info-item">${date}</div></div>
</li>`;
const LIST = `<article id="section-list" class="altlist-body"><ul class="altlist-text">
${item("21", "첫 기사 &quot;제목&quot;", "11-24 07:46")}
${item("22", "둘째 기사", "11-20 13:11")}
${item("21", "같은 기사 또", "11-24 07:46")}
<li class="altlist-text-item"><div class="altlist-text-group"><H2 class="altlist-subject"><a href="" class="replace-titles linked"></a></H2></div></li>
</ul></article>`;

const PAGE = `<meta name="description" content="다른 설명"/>
<meta property="og:image" content="https://cdn.okinews.com/news/photo/202611/21.jpg" />
<meta property="og:description" content="요약 &quot;글&quot; 입니다" />
<meta property="article:published_time" content="2026-11-24T07:46:24+09:00">
<ul class="breadcrumbs"><li>입력 2026.11.24 07:46</li>\n<li>댓글 3</li></ul>`;

const XML = `<rss><channel><item><title>둘째</title><link>https://www.okinews.com/news/articleView.html?idxno=22</link>
<description><![CDATA[둘째 기사의 긴 요약]]></description><pubDate>2026-11-20 13:11:59</pubDate></item>
<item><title>셋째</title><link>https://www.okinews.com/news/articleView.html?idxno=13</link><description><![CDATA[셋째 요약]]></description></item>
<item><title>넷째</title><link>https://www.okinews.com/news/articleView.html?idxno=14</link></item></channel></rss>`;

const NOW = new Date("2026-11-24T12:00:00+09:00");

describe("옥천신문 기사 목록 (T-NEWS-01)", () => {
  it("기사 목록에서 번호·제목·분야·날짜를 뽑는다 (같은 기사는 한 번, 빈 틀은 건너뜀)", () => {
    const list = parseArticleList(LIST);
    expect(list.map((a) => a.id)).toEqual(["21", "22"]);
    expect(list[0]).toEqual({ id: "21", title: '첫 기사 "제목"', section: "사회일반", date: "11-24 07:46" });
  });

  it("사이트 구조가 바뀌어도 죽지 않는다", () => {
    expect(parseArticleList("<html></html>")).toEqual([]);
    expect(parseRss("")).toEqual([]);
    expect(parseArticleMeta("")).toEqual({ summary: null, image: null, publishedAt: null });
  });

  it("기사 화면에서 요약·사진·올라온 시각을 읽는다", () => {
    expect(parseArticleMeta(PAGE)).toEqual({ summary: '요약 "글" 입니다', image: "https://cdn.okinews.com/news/photo/202611/21.jpg", publishedAt: "2026-11-24T07:46:24+09:00" });
  });

  it("옥천신문 이미지 주소가 아니면 쓰지 않는다", () => {
    expect(parseArticleMeta('<meta property="og:image" content="https://evil.example/b.png" />').image).toBeNull();
  });

  it("RSS 의 시각은 서울 시각으로 읽는다", () => {
    const rss = parseRss(XML);
    expect(rss.map((r) => r.id)).toEqual(["22", "13", "14"]);
    expect(rss[0].publishedAt).toBe("2026-11-20T13:11:59+09:00");
    expect(rss[2].summary).toBeNull();
  });
});

describe("목록 날짜 (T-NEWS-02)", () => {
  it("연도가 없는 '11-24 07:46' 을 올해 날짜로", () => {
    expect(listDate("11-24 07:46", NOW)).toBe("2026-11-24T07:46:00+09:00");
  });
  it("해가 바뀐 직후에는 지난해 12월로 본다", () => {
    expect(listDate("12-30 10:00", new Date("2027-01-02T09:00:00+09:00"))).toBe("2026-12-30T10:00:00+09:00");
  });
  it("모양이 다르면 null", () => {
    expect(listDate("어제", NOW)).toBeNull();
    expect(listDate(null, NOW)).toBeNull();
  });
});

describe("최근 5일 기사 (T-NEWS-03)", () => {
  const news = (id: string, publishedAt: string | null) => ({ id, publishedAt });
  it("오늘을 빼고 5일 전 날짜까지의 기사만, 새 순서로", () => {
    const list = [news("old", "2026-11-18T23:59:00+09:00"), news("edge", "2026-11-19T00:00:00+09:00"), news("new", "2026-11-24T07:00:00+09:00"), news("mid", "2026-11-21T10:00:00+09:00")];
    expect(recentNews(list, NOW).map((n) => n.id)).toEqual(["new", "mid", "edge"]);
  });
  it("날짜를 모르는 기사는 뺀다", () => {
    expect(recentNews([news("x", null), news("y", "언젠가")], NOW)).toEqual([]);
  });
  it("기간을 바꿀 수 있다", () => {
    expect(recentNews([news("a", "2026-11-22T10:00:00+09:00"), news("b", "2026-11-23T10:00:00+09:00")], NOW, 1).map((n) => n.id)).toEqual(["b"]);
  });
});

describe("기사 합치기 (T-NEWS-04)", () => {
  it("요약은 RSS 가 있으면 그것을, 없으면 기사 화면의 것을 쓴다. 날짜는 기사 화면, 없으면 목록의 것", () => {
    const list = parseArticleList(LIST);
    const built = buildNews(list, [{ ...parseArticleMeta(PAGE), comments: 3 }, { summary: null, image: null, publishedAt: null, comments: null }], parseRss(XML), NOW);
    expect(built[0]).toMatchObject({ id: "21", url: "https://www.okinews.com/news/articleView.html?idxno=21", summary: '요약 "글" 입니다', publishedAt: "2026-11-24T07:46:24+09:00", comments: 3 });
    expect(built[1]).toMatchObject({ id: "22", summary: "둘째 기사의 긴 요약", publishedAt: "2026-11-20T13:11:59+09:00", comments: null });
  });
  it("기사 화면을 못 읽어도 목록의 제목과 날짜로 보여 준다", () => {
    const built = buildNews([{ id: "30", title: "제목만", section: null, date: "11-23 09:00" }], [undefined], [], NOW);
    expect(built[0]).toMatchObject({ id: "30", title: "제목만", summary: null, publishedAt: "2026-11-23T09:00:00+09:00" });
  });
});

describe("parseCommentCount", () => {
  it("기사 정보 줄의 '댓글 N'을 읽는다", () => {
    expect(parseCommentCount('<ul class="breadcrumbs"><li>입력 2026.11.06 10:55</li>\n<li>호수 1866</li>\n<li>댓글 12</li>   </ul>')).toBe(12);
  });
  it("없으면 null", () => {
    expect(parseCommentCount("<html></html>")).toBeNull();
  });
});
