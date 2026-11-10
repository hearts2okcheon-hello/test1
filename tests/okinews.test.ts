import { describe, expect, it } from "vitest";
import { mergeNews, parseFrontPage, parseRss, parseCommentCount } from "@/lib/okinews";

const HTML = `<div id="skin-1" class="auto-article"><div class="item large"><a href="https://www.okinews.com/news/articleView.html?idxno=11" class="frame">
<em style="background-image:url('https://cdn.okinews.com/a.png')"></em></a><a href="x"><H2 class="t">큰 기사 &quot;제목&quot;</H2></a></div>
<div class="item medium"><a href="https://www.okinews.com/news/articleView.html?idxno=12" class="frame">
<em style="background-image:url('https://evil.example/b.png')"></em></a><a href="x"><H2>둘째</H2></a></div>
<div class="item small">빈칸</div>`;

const XML = `<rss><channel><item><title>둘째</title><link>https://www.okinews.com/news/articleView.html?idxno=12</link>
<description><![CDATA[둘째 요약]]></description><pubDate>2026-11-09 10:00:00</pubDate></item>
<item><title>셋째</title><link>https://www.okinews.com/news/articleView.html?idxno=13</link><description><![CDATA[셋째 요약]]></description></item>
<item><title>넷째</title><link>https://www.okinews.com/news/articleView.html?idxno=14</link></item></channel></rss>`;

describe("옥천신문 뉴스", () => {
  it("1면 기사의 제목과 사진을 뽑는다", () => {
    const front = parseFrontPage(HTML);
    expect(front.map((f) => f.id)).toEqual(["11", "12"]);
    expect(front[0].title).toBe('큰 기사 "제목"');
    expect(front[0].image).toBe("https://cdn.okinews.com/a.png");
  });

  it("옥천신문 이미지 주소가 아니면 쓰지 않는다", () => {
    expect(parseFrontPage(HTML)[1].image).toBeNull();
  });

  it("1면 3개가 안 되면 최신 기사로 채우고 요약을 합친다", () => {
    const news = mergeNews(parseFrontPage(HTML), parseRss(XML));
    expect(news.map((n) => n.id)).toEqual(["11", "12", "13"]);
    expect(news[1].summary).toBe("둘째 요약");
    expect(news[2].url).toBe("https://www.okinews.com/news/articleView.html?idxno=13");
  });

  it("사이트 구조가 바뀌어도 죽지 않는다", () => {
    expect(mergeNews(parseFrontPage("<html></html>"), parseRss(""))).toEqual([]);
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
