export const NAV_START = "ok:nav-start";
/** 화면을 새로 받았다 (받아 둔 다른 화면이 지워졌으니 다시 받아 두라는 신호) */
export const REFRESHED = "ok:refreshed";
/** 이미 보고 있는 아래 탭을 다시 눌렀다 (홈은 전체 · 맨 위로 돌아간다). detail 은 그 탭의 주소 */
export const TAB_RESELECT = "ok:tab-reselect";

/** 이 주소로 가면 앱 안에서 다른 화면으로 넘어가는가 (전화·외부 링크, 같은 화면, #이동은 아니다) */
export function isInternalNav(target: string, current: string): boolean {
  let to: URL;
  let from: URL;
  try {
    from = new URL(current);
    to = new URL(target, from);
  } catch {
    return false;
  }
  if (to.origin !== from.origin) return false;
  return to.pathname + to.search !== from.pathname + from.search;
}

/** 로딩 화면을 띄우고 이동한다. 코드로 이동할 때는 router.push 대신 이것을 쓴다 */
export function pushWithLoading(router: { push(href: string): void }, href: string) {
  if (isInternalNav(href, window.location.href)) window.dispatchEvent(new Event(NAV_START));
  router.push(href);
}

// ── 뒤로 가기 ────────────────────────────────────────────
// 앱을 연 뒤 화면을 몇 번 옮겼는가 (처음 연 화면은 세지 않는다)
let lastSeen: string | null = null;
let moves = 0;

/** 화면이 바뀔 때마다 지금 주소를 알려 준다 (components/NavLoading 이 부른다) */
export function noteArrival(url: string) {
  if (lastSeen !== null && lastSeen !== url) moves++;
  lastSeen = url;
}

/**
 * "뒤로"를 누르면 앱 안의 앞 화면으로 돌아갈 수 있는가. 링크로 바로 들어왔으면 false (그때는 홈으로 보낸다).
 * 브라우저가 알려 주면(Navigation API 의 canGoBack) 그대로 따르고,
 * 알려 주지 않는 브라우저에서는 앱 안에서 화면을 옮긴 적이 있는지로 짐작한다
 */
export function canGoBack(env: { canGoBack?: boolean; moves: number; referrer: string; origin: string }): boolean {
  if (typeof env.canGoBack === "boolean") return env.canGoBack;
  return env.moves > 0 || env.referrer.startsWith(env.origin);
}

function appCanGoBack(): boolean {
  const nav = (window as unknown as { navigation?: { canGoBack?: boolean } }).navigation;
  return canGoBack({ canGoBack: nav?.canGoBack, moves, referrer: document.referrer, origin: window.location.origin });
}

type BackRouter = { back(): void; push(href: string): void; replace(href: string): void; refresh(): void };

/** 들어온 화면으로 돌아간다. 돌아갈 화면이 없으면(링크로 바로 들어옴) fallback 으로 간다 */
export function goBack(router: BackRouter, fallback = "/") {
  if (appCanGoBack()) router.back();
  else router.push(fallback);
}

/**
 * 글을 고치거나 지운 뒤: 들어온 화면으로 돌아가서 그 화면을 새로 받는다 (고친 내용이 바로 보이게).
 * 돌아갈 화면이 없으면 fallback 으로 간다
 */
export function goBackRefreshed(router: BackRouter, fallback: string) {
  if (!appCanGoBack()) {
    router.replace(fallback);
    router.refresh();
    return;
  }
  // 돌아간 다음에 새로 받아야 한다. 먼저 받으면 돌아가는 동안 버려진다
  window.addEventListener("popstate", () => router.refresh(), { once: true });
  router.back();
}
