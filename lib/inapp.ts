// 카카오톡 등 다른 앱 안에서 연 화면(앱 안 브라우저)에서는 "홈 화면에 추가"와 알림이 안 된다.
// 알아채서 사파리·크롬으로 넘긴다 (ADR-013)

export type InApp = "kakao" | "naver" | "other";

export function inAppBrowser(ua: string): InApp | null {
  if (/KAKAOTALK/i.test(ua)) return "kakao";
  if (/NAVER\(inapp|DaumApps|DaumDevice/i.test(ua)) return "naver";
  if (/Instagram|FBAN|FBAV|FB_IAB|Line\/|everytimeApp|BAND\//i.test(ua)) return "other";
  return null;
}

/**
 * 아이폰 iOS 큰 버전 (아이폰이 아니면 null).
 * iOS 26 부터 사파리는 OS 를 18_6 으로 고정해 알려 주므로, 사파리 버전(Version/N)이 더 크면 그것을 쓴다
 */
export function iosMajor(ua: string): number | null {
  const m = ua.match(/(?:iPhone|iPad|iPod)[^)]*OS (\d+)_/);
  if (!m) return null;
  const safari = ua.match(/Version\/(\d+)/);
  return Math.max(Number(m[1]), safari ? Number(safari[1]) : 0);
}

/**
 * 바깥 브라우저로 여는 주소.
 * 카카오톡은 아이폰·안드로이드 모두 kakaotalk://web/openExternal 을 지원한다.
 * 안드로이드의 다른 앱은 intent 로 크롬을 연다. 아이폰의 다른 앱은 방법이 없어 null (안내만 한다)
 */
export function externalOpenUrl(app: InApp, url: string, android: boolean): string | null {
  if (app === "kakao") return `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
  if (android) {
    const u = new URL(url);
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;end`;
  }
  return null;
}
