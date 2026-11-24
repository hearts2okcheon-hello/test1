import { describe, expect, it } from "vitest";
import { canGoBack } from "@/lib/nav";
import { feedHref, postActions, postEditHref, postHref, storyEditHref, storyHref } from "@/lib/posts";

const STORE = "11111111-1111-1111-1111-111111111111";
const ITEM = "22222222-2222-2222-2222-222222222222";

describe("사장님 소식 한 줄을 누르면 갈 곳 (T-PLAZA-03)", () => {
  it("사장님이 쓴 글(소식·공지)은 그 글 화면으로 간다", () => {
    expect(feedHref({ item_type: "post", store_id: STORE, item_id: ITEM })).toBe(`/stores/${STORE}/posts/${ITEM}`);
  });
  it("팻말 알림과 임시휴무는 따로 글이 없으니 가게 화면으로 간다", () => {
    expect(feedHref({ item_type: "notice", store_id: STORE, item_id: ITEM })).toBe(`/stores/${STORE}`);
    expect(feedHref({ item_type: "closure", store_id: STORE, item_id: ITEM })).toBe(`/stores/${STORE}`);
  });
  it("글 화면과 고치는 화면의 주소", () => {
    expect(postHref(STORE, ITEM)).toBe(`/stores/${STORE}/posts/${ITEM}`);
    expect(postEditHref(STORE, ITEM)).toBe(`/stores/${STORE}/posts/${ITEM}/edit`);
    expect(storyHref(ITEM)).toBe(`/news/${ITEM}`);
    expect(storyEditHref(ITEM)).toBe(`/news/${ITEM}/edit`);
  });
});

describe("글 오른쪽 위 점 세 개 메뉴 (T-POST-05)", () => {
  it("내가 쓴 글이면 수정과 삭제가 나온다", () => {
    expect(postActions({ mine: true })).toEqual(["edit", "delete"]);
    expect(postActions({ mine: true, admin: true })).toEqual(["edit", "delete"]);
  });
  it("관리자는 남의 글을 지울 수만 있다 (고치지는 못한다)", () => {
    expect(postActions({ mine: false, admin: true })).toEqual(["delete"]);
  });
  it("남의 글에는 메뉴가 없다", () => {
    expect(postActions({ mine: false })).toEqual([]);
    expect(postActions({ mine: false, admin: false })).toEqual([]);
  });
});

describe("뒤로 가기: 앱 안의 앞 화면으로, 없으면 홈으로 (T-NAV-01)", () => {
  const origin = "https://oksori.test";
  it("브라우저가 알려 주면 그대로 따른다", () => {
    expect(canGoBack({ canGoBack: true, moves: 0, referrer: "", origin })).toBe(true);
    expect(canGoBack({ canGoBack: false, moves: 5, referrer: `${origin}/news`, origin })).toBe(false);
  });
  it("모르면, 앱 안에서 화면을 옮긴 적이 있으면 돌아갈 수 있다", () => {
    expect(canGoBack({ moves: 1, referrer: "", origin })).toBe(true);
    expect(canGoBack({ moves: 0, referrer: `${origin}/news`, origin })).toBe(true);
  });
  it("링크로 바로 들어왔으면 돌아갈 화면이 없다", () => {
    expect(canGoBack({ moves: 0, referrer: "", origin })).toBe(false);
    expect(canGoBack({ moves: 0, referrer: "https://talk.kakao.com/", origin })).toBe(false);
  });
});
