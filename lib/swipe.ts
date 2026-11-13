/** 아래 탭 순서. 이 세 화면에서만 좌우로 밀어 탭을 바꾼다 */
export const TAB_ORDER = ["/", "/news", "/owner"] as const;

const MIN_DX = 70;
const LOCK_DX = 12;

/** 손가락이 움직인 거리(dx, dy)로 갈 탭을 정한다. 넘기지 않으면 null */
export function swipeTarget(pathname: string, dx: number, dy: number): string | null {
  const i = TAB_ORDER.indexOf(pathname as (typeof TAB_ORDER)[number]);
  if (i < 0) return null;
  if (Math.abs(dx) < MIN_DX || Math.abs(dy) > Math.abs(dx) * 0.5) return null;
  const next = i + (dx < 0 ? 1 : -1);
  return TAB_ORDER[next] ?? null;
}

/** dx 방향에 이웃 탭이 있는가 */
export function neighborTab(pathname: string, dx: number): string | null {
  const i = TAB_ORDER.indexOf(pathname as (typeof TAB_ORDER)[number]);
  if (i < 0 || dx === 0) return null;
  return TAB_ORDER[i + (dx < 0 ? 1 : -1)] ?? null;
}

/**
 * 밀기 시작을 가로 밀기로 볼 것인가. 아직 모르면 null, 위아래 스크롤이면 false.
 * 한 번 정하면 손을 뗄 때까지 바꾸지 않는다
 */
export function swipeLock(dx: number, dy: number): boolean | null {
  if (Math.abs(dx) < LOCK_DX && Math.abs(dy) < LOCK_DX) return null;
  return Math.abs(dx) > Math.abs(dy) * 1.5;
}

/** 손가락을 따라 화면이 움직일 거리. 그쪽에 탭이 없으면 조금만 끌려온다 (끝에서 튕기는 느낌) */
export function dragOffset(pathname: string, dx: number): number {
  return neighborTab(pathname, dx) ? dx : dx * 0.2;
}
