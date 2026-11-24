import { describe, expect, it } from "vitest";
import { BANNERS } from "@/lib/banners";
import { isLifeSection, lifeFirst } from "@/lib/okinews";
import { POST_PAGE, firstPage, splitPosts } from "@/lib/posts";
import { feedDetail, feedTag } from "@/lib/signs";

const post = (id: string, kind: "news" | "notice", at: string) => ({ id, kind, created_at: at });

describe("가게 소식의 순서 (T-POST-02)", () => {
  const posts = [post("n1", "news", "2026-11-20T09:00:00Z"), post("g1", "notice", "2026-11-18T09:00:00Z"), post("n2", "news", "2026-11-22T09:00:00Z"), post("g2", "notice", "2026-11-21T09:00:00Z")];
  it("공지는 따로 맨 위로, 공지와 소식 모두 새 글이 먼저", () => {
    const { notices, news } = splitPosts(posts);
    expect(notices.map((p) => p.id)).toEqual(["g2", "g1"]);
    expect(news.map((p) => p.id)).toEqual(["n2", "n1"]);
  });
  it("공지나 소식이 없으면 그쪽은 비어 있다", () => {
    expect(splitPosts([post("n1", "news", "2026-11-20T09:00:00Z")])).toEqual({ notices: [], news: [post("n1", "news", "2026-11-20T09:00:00Z")] });
    expect(splitPosts([])).toEqual({ notices: [], news: [] });
  });
});

describe("세 개까지 보여 주고 더 보기 (T-POST-03)", () => {
  const items = ["a", "b", "c", "d", "e"];
  it("처음에는 세 개만, 남은 수를 알려 준다", () => {
    expect(POST_PAGE).toBe(3);
    expect(firstPage(items, false)).toEqual({ shown: ["a", "b", "c"], more: 2 });
  });
  it("더 보기를 누르면 모두 보여 준다", () => {
    expect(firstPage(items, true)).toEqual({ shown: items, more: 0 });
  });
  it("세 개 이하면 더 보기가 없다", () => {
    expect(firstPage(["a", "b", "c"], false)).toEqual({ shown: ["a", "b", "c"], more: 0 });
    expect(firstPage([], false)).toEqual({ shown: [], more: 0 });
  });
});

describe("홈에 보이는 글의 종류 표시 (T-HOME-05)", () => {
  it("사장님 글은 공지와 소식을 구별한다", () => {
    expect(feedTag({ item_type: "post", kind: "notice" }).label).toBe("공지");
    expect(feedTag({ item_type: "post", kind: "news" }).label).toBe("소식");
    expect(feedTag({ item_type: "post", kind: "notice" }).bg).not.toBe(feedTag({ item_type: "post", kind: "news" }).bg);
  });
  it("임시휴무와 팻말 알림은 그 이름으로", () => {
    expect(feedTag({ item_type: "closure", kind: "temp_closed" }).label).toBe("임시휴무");
    expect(feedTag({ item_type: "notice", kind: "out" }).label).toBe("외출 중");
    expect(feedTag({ item_type: "notice", kind: "late_open" }).label).toBe("늦게 열어요");
    expect(feedTag({ item_type: "notice", kind: "sold_out" }).label).toBe("재료 소진");
  });
});

describe("홈에 보이는 글의 내용 (T-HOME-05)", () => {
  const base = { at_time: null, memo: null, closure_start: null, closure_end: null };
  it("쪽지 없는 팻말 알림은 종류 표시와 겹치지 않게 풀어 쓴다", () => {
    expect(feedDetail({ ...base, item_type: "notice", kind: "out" })).toBe("잠깐 외출 중이에요");
    expect(feedDetail({ ...base, item_type: "notice", kind: "out", at_time: "15:00" })).toBe("오후 3시에 돌아와요");
    expect(feedDetail({ ...base, item_type: "notice", kind: "sold_out" })).toBe("재료가 다 떨어졌어요");
  });
  it("쪽지가 있으면 쪽지를, 사장님 글은 글 내용을, 임시휴무는 기간을 보여 준다", () => {
    expect(feedDetail({ ...base, item_type: "notice", kind: "open", memo: "마감 할인해요" })).toBe("마감 할인해요");
    expect(feedDetail({ ...base, item_type: "post", kind: "notice", memo: "이번 주 토요일은 쉽니다" })).toBe("이번 주 토요일은 쉽니다");
    expect(feedDetail({ ...base, item_type: "closure", kind: "temp_closed", closure_start: "2026-12-12", closure_end: "2026-12-16" })).toBe("12월 12일 ~ 12월 16일 임시휴무");
  });
});

describe("옥천신문: 생활 기사 먼저 (T-NEWS-05)", () => {
  it("정치·칼럼은 생활 기사가 아니다. 분야를 모르면 생활 기사로 둔다", () => {
    expect(isLifeSection("사회일반")).toBe(true);
    expect(isLifeSection("교육")).toBe(true);
    expect(isLifeSection("인물일반")).toBe(true);
    expect(isLifeSection("정치일반")).toBe(false);
    expect(isLifeSection("칼럼")).toBe(false);
    expect(isLifeSection(null)).toBe(true);
  });
  it("생활 기사를 앞에 두고, 그 안에서는 받은 순서(새 기사 먼저)를 지킨다", () => {
    const list = [{ id: "1", section: "정치일반" }, { id: "2", section: "사회일반" }, { id: "3", section: "칼럼" }, { id: "4", section: "교육" }, { id: "5", section: null }];
    expect(lifeFirst(list).map((n) => n.id)).toEqual(["2", "4", "5", "1", "3"]);
  });
});

describe("소통광장 광고 배너 (T-PLAZA-02)", () => {
  it("배너마다 이름표(id)가 다르고, 제목과 갈 곳이 있다", () => {
    expect(new Set(BANNERS.map((b) => b.id)).size).toBe(BANNERS.length);
    expect(BANNERS.length).toBeGreaterThan(0);
    for (const b of BANNERS) {
      expect(b.title).not.toBe("");
      expect(b.href.startsWith("/") || b.href.startsWith("https://")).toBe(true);
    }
  });
});
