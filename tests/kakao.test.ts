import { describe, expect, it } from "vitest";
import { kakaoAuthorizeUrl, safeNext } from "@/lib/kakao";

describe("kakaoAuthorizeUrl", () => {
  it("닉네임과 openid 만 요청하고 이메일은 요청하지 않는다", () => {
    const u = new URL(kakaoAuthorizeUrl("key", "https://oksori.test", "s1"));
    expect(u.searchParams.get("scope")).toBe("openid profile_nickname");
    expect(u.searchParams.get("scope")).not.toContain("account_email");
    expect(u.searchParams.get("redirect_uri")).toBe("https://oksori.test/auth/kakao/callback");
    expect(u.searchParams.get("state")).toBe("s1");
  });
});

describe("safeNext", () => {
  it("우리 사이트 경로만 허용", () => {
    expect(safeNext("/owner/register")).toBe("/owner/register");
    expect(safeNext("//evil.example")).toBe("/owner");
    expect(safeNext("/\\evil.example")).toBe("/owner");
    expect(safeNext("https://evil.example")).toBe("/owner");
    expect(safeNext(null)).toBe("/owner");
  });
});
