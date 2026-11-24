import { describe, expect, it } from "vitest";
import { parseArticleTitle } from "@/lib/okinews";
import { articleDate, articleIdFrom, articleUrl, articlesByStore } from "@/lib/storeArticles";
import type { StoreArticle } from "@/lib/types";

describe("기사 주소에서 번호 읽기 (T-ARTICLE-07)", () => {
  it("옥천신문 기사 주소에서 번호를 읽는다", () => {
    expect(articleIdFrom("https://www.okinews.com/news/articleView.html?idxno=302950")).toBe("302950");
    expect(articleIdFrom("  https://www.okinews.com/news/articleView.html?idxno=302950#comment \n")).toBe("302950");
    expect(articleIdFrom("https://m.okinews.com/news/articleView.html?idxno=12&sc=1")).toBe("12");
    expect(articleIdFrom("www.okinews.com/news/articleView.html?idxno=77")).toBe("77");
  });
  it("번호만 적어도 된다", () => {
    expect(articleIdFrom("302950")).toBe("302950");
  });
  it("옥천신문 주소가 아니거나 번호가 없으면 받지 않는다", () => {
    expect(articleIdFrom("https://evil.example/news/articleView.html?idxno=302950")).toBeNull();
    expect(articleIdFrom("https://notokinews.com/news/articleView.html?idxno=1")).toBeNull();
    expect(articleIdFrom("https://www.okinews.com/news/articleList.html")).toBeNull();
    expect(articleIdFrom("https://www.okinews.com/news/articleView.html?idxno=abc")).toBeNull();
    expect(articleIdFrom("우리 가게 기사")).toBeNull();
    expect(articleIdFrom("")).toBeNull();
  });
});

describe("기사 화면에서 제목 읽기 (T-ARTICLE-08)", () => {
  it("제목 끝의 ' - 옥천신문'은 떼고, 특수 문자는 풀어 준다", () => {
    expect(parseArticleTitle('<meta property="og:title" content="청산면주민자치회, &quot;돌봄&quot; 배웠다 - 옥천신문" />')).toBe('청산면주민자치회, "돌봄" 배웠다');
  });
  it("제목이 없으면 null (없는 기사)", () => {
    expect(parseArticleTitle("<html><title>옥천신문</title></html>")).toBeNull();
    expect(parseArticleTitle("")).toBeNull();
  });
});

describe("가게 칸에 보여 줄 기사 (T-ARTICLE-09)", () => {
  const row = (store_id: string, article_id: string): StoreArticle => ({ store_id, article_id, title: `기사 ${article_id}`, image_url: null, published_at: null });
  it("가게마다 묶고, 받은 순서(새 기사 먼저)를 지킨다", () => {
    const map = articlesByStore([row("a", "3"), row("b", "9"), row("a", "1")]);
    expect(Object.keys(map).sort()).toEqual(["a", "b"]);
    expect(map.a.map((x) => x.article_id)).toEqual(["3", "1"]);
    expect(articlesByStore([])).toEqual({});
  });
  it("기사 주소를 만든다", () => {
    expect(articleUrl("302950")).toBe("https://www.okinews.com/news/articleView.html?idxno=302950");
  });
  it("올라온 날짜는 서울 날짜로, 연도까지 보여 준다", () => {
    expect(articleDate("2026-11-23T22:27:24+00:00")).toBe("2026년 11월 24일");
    expect(articleDate("2025-03-02T09:00:00+09:00")).toBe("2025년 3월 2일");
    expect(articleDate(null)).toBeNull();
    expect(articleDate("언젠가")).toBeNull();
  });
});
