export const NAV_START = "ok:nav-start";

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
