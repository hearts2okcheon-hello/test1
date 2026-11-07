// 임시휴무 달력. 날짜는 "YYYY-MM-DD" 문자열로만 다룬다 (기기 시간대에 흔들리지 않게)

/** 서울 기준 오늘 */
export function seoulToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** m 은 1~12. 앞쪽 빈칸(null) + 그 달의 날짜. 일요일 시작 */
export function monthGrid(y: number, m: number): (string | null)[] {
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [...Array<null>(first).fill(null), ...Array.from({ length: days }, (_, i) => toDateStr(y, m, i + 1))];
}

export function addMonth(y: number, m: number, delta: number): [number, number] {
  const t = y * 12 + (m - 1) + delta;
  return [Math.floor(t / 12), (t % 12) + 1];
}

/** 첫 번째 탭 = 시작, 두 번째 탭 = 끝. 시작보다 앞을 누르거나 이미 다 골랐으면 새로 시작 */
export function pickRange(cur: { start: string | null; end: string | null }, day: string): { start: string | null; end: string | null } {
  if (!cur.start || cur.end || day < cur.start) return { start: day, end: null };
  return { start: cur.start, end: day };
}
