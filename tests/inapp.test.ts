import { describe, expect, it } from "vitest";
import { externalOpenUrl, inAppBrowser, iosMajor } from "@/lib/inapp";

const IOS_KAKAO = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 25.1.0";
const IOS_SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const AND_KAKAO = "Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36;KAKAOTALK 2410160";
const IOS_NAVER = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 NAVER(inapp; search; 2000; 12.6.6)";
const IOS_INSTAGRAM = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0";

describe("앱 안 브라우저 감지", () => {
  it("카카오톡·네이버·인스타그램 안에서 연 화면을 알아챈다", () => {
    expect(inAppBrowser(IOS_KAKAO)).toBe("kakao");
    expect(inAppBrowser(AND_KAKAO)).toBe("kakao");
    expect(inAppBrowser(IOS_NAVER)).toBe("naver");
    expect(inAppBrowser(IOS_INSTAGRAM)).toBe("other");
  });
  it("사파리·크롬은 앱 안 브라우저가 아니다", () => {
    expect(inAppBrowser(IOS_SAFARI)).toBeNull();
    expect(inAppBrowser("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36")).toBeNull();
  });
  it("아이폰 iOS 버전", () => {
    expect(iosMajor(IOS_SAFARI)).toBe(26);
    // iOS 26 부터 사파리는 OS 를 18_6 으로 고정해 알려 준다. Version/ 이 실제 버전
    expect(iosMajor("Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0.1 Mobile/15E148 Safari/604.1")).toBe(27);
    expect(iosMajor(IOS_KAKAO)).toBe(18);
    expect(iosMajor(AND_KAKAO)).toBeNull();
  });
  it("카카오톡은 바깥 브라우저로 여는 주소를 쓴다", () => {
    expect(externalOpenUrl("kakao", "https://oksori.vercel.app/stores/1?a=b", false)).toBe(
      "kakaotalk://web/openExternal?url=https%3A%2F%2Foksori.vercel.app%2Fstores%2F1%3Fa%3Db",
    );
    expect(externalOpenUrl("naver", "https://oksori.vercel.app/", true)).toBe("intent://oksori.vercel.app/#Intent;scheme=https;package=com.android.chrome;end");
    expect(externalOpenUrl("naver", "https://oksori.vercel.app/", false)).toBeNull();
  });
});
