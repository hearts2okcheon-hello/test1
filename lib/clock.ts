/** 시간 돌림판(오전/오후 · 시 · 분)과 "HH:MM" 사이를 오간다 */
export type ClockParts = { pm: boolean; hour: number; minute: number };

/** "13:05" → 오후 1시 5분. 잘못된 값이면 오전 12시 0분 */
export function splitClock(time: string | null | undefined): ClockParts {
  const [h, m] = (time ?? "").split(":").map(Number);
  const hh = Number.isInteger(h) && h >= 0 && h <= 23 ? h : 0;
  const mm = Number.isInteger(m) && m >= 0 && m <= 59 ? m : 0;
  return { pm: hh >= 12, hour: hh % 12 === 0 ? 12 : hh % 12, minute: mm };
}

/** 오후 1시 5분 → "13:05". 오전 12시는 00시, 오후 12시는 12시 */
export function joinClock({ pm, hour, minute }: ClockParts): string {
  const h = (hour % 12) + (pm ? 12 : 0);
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** 지금 시각 뒤의 가까운 정각·30분 (돌림판의 처음 값). 자정을 넘기지 않는다 */
export function nextHalfHour(now: string): string {
  const [h, m] = now.split(":").map(Number);
  const mins = Math.min(Math.ceil((h * 60 + m + 1) / 30) * 30, 23 * 60 + 30);
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}
