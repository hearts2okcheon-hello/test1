/** 아래 탭 순서. 이 세 화면에서만 좌우로 밀어 탭을 바꾼다 */
export const TAB_ORDER = ["/", "/news", "/owner"] as const;

const MIN_DX = 70;

/** 손가락이 움직인 거리(dx, dy)로 갈 탭을 정한다. 넘기지 않으면 null */
export function swipeTarget(pathname: string, dx: number, dy: number): string | null {
  const i = TAB_ORDER.indexOf(pathname as (typeof TAB_ORDER)[number]);
  if (i < 0) return null;
  if (Math.abs(dx) < MIN_DX || Math.abs(dy) > Math.abs(dx) * 0.5) return null;
  const next = i + (dx < 0 ? 1 : -1);
  return TAB_ORDER[next] ?? null;
}
