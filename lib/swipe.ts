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

/** 미리 받아 둔 탭 화면을 이만큼은 새것으로 본다 (그 안에는 들어가서 다시 받지 않는다) */
export const WARM_FRESH_MS = 25_000;

/** 지금 탭이 아닌 나머지 탭들 (미리 받아 둘 대상) */
export function otherTabs(pathname: string): string[] {
  return TAB_ORDER.includes(pathname as (typeof TAB_ORDER)[number]) ? TAB_ORDER.filter((t) => t !== pathname) : [];
}

/** 받아 둔 지 얼마 안 됐으면 true. 받은 적이 없으면(0, undefined) false */
export function isWarm(warmedAt: number | undefined, now: number): boolean {
  return !!warmedAt && now - warmedAt < WARM_FRESH_MS;
}

/**
 * 탭 화면 안에 자기만의 옆 넘김(홈의 카테고리)이 있으면 여기에 등록한다.
 * 손가락이 가는 쪽에 넘길 것이 있다고 하면 탭 밀기는 그 손짓을 양보하고, 끝에 닿았을 때만 탭을 넘긴다
 */
let innerPager: ((dx: number) => boolean) | null = null;

export function setInnerPager(canGo: ((dx: number) => boolean) | null): void {
  innerPager = canGo;
}

export function innerPagerTakes(dx: number): boolean {
  return innerPager ? innerPager(dx) : false;
}

const FLICK_SPEED = 0.5; // px/ms
const FLICK_MIN_DX = 24;

/**
 * 손을 뗐을 때 다음 화면으로 넘길 것인가. dx 는 민 거리, vx 는 뗄 때의 빠르기(px/ms).
 * 충분히 밀었거나, 조금 밀었어도 같은 쪽으로 빠르게 튕겼으면 넘긴다
 */
export function shouldCommitSwipe(dx: number, vx: number, width: number): boolean {
  if (width <= 0) return false;
  if (Math.abs(dx) >= MIN_DX) return true;
  return Math.abs(dx) >= FLICK_MIN_DX && Math.abs(vx) >= FLICK_SPEED && Math.sign(vx) === Math.sign(dx);
}
