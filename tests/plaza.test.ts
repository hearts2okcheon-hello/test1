import { describe, expect, it } from "vitest";
import { showsStoreMenu, writeMenu } from "@/lib/intent";
import { PLAZA_TABS, plazaTab } from "@/lib/plaza";

describe("소통광장 동네 이야기의 줄 (T-PLAZA-01)", () => {
  it("전체 대신 옥천신문이 맨 앞: 옥천신문 · 동네 이야기 · 사장님 소식 · 이웃 제보", () => {
    expect(PLAZA_TABS.map((t) => t.name)).toEqual(["옥천신문", "동네 이야기", "사장님 소식", "이웃 제보"]);
  });
  it("주소의 ?tab= 값은 아는 것만 받는다", () => {
    expect(plazaTab("community")).toBe("community");
    expect(plazaTab("okinews")).toBe("okinews");
    expect(plazaTab("all")).toBeNull();
    expect(plazaTab(undefined)).toBeNull();
  });
});

describe("쓰기 버튼에 펼쳐지는 것 (T-WRITE-01)", () => {
  it("가게를 등록하는(한) 사람: 위에서부터 동네 이야기 · 사장님 소식 · 이웃 제보", () => {
    expect(writeMenu(true)).toEqual(["story", "owner", "report"]);
  });
  it("가게를 등록하지 않거나 로그인하지 않은 사람: 사장님 소식 없이 동네 이야기 · 이웃 제보", () => {
    expect(writeMenu(false)).toEqual(["story", "report"]);
  });
});

describe("내 공간의 가게 메뉴 (T-ME-14)", () => {
  it("가게를 등록하지 않겠다고 답했으면 가게 등록하기를 보이지 않는다", () => {
    expect(showsStoreMenu({ wantsStore: false, hasStore: false, hasCode: false })).toBe(false);
  });
  it("예라고 답했거나, 아직 묻지 않은 예전 가입자에게는 보인다", () => {
    expect(showsStoreMenu({ wantsStore: true, hasStore: false, hasCode: false })).toBe(true);
    expect(showsStoreMenu({ wantsStore: null, hasStore: false, hasCode: false })).toBe(true);
    expect(showsStoreMenu({ wantsStore: undefined, hasStore: false, hasCode: false })).toBe(true);
  });
  it("이미 가게가 있거나 가게 코드를 받았으면 답과 상관없이 보인다", () => {
    expect(showsStoreMenu({ wantsStore: false, hasStore: true, hasCode: false })).toBe(true);
    expect(showsStoreMenu({ wantsStore: false, hasStore: false, hasCode: true })).toBe(true);
  });
});
