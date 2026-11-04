/** 관리자 가게 등록 폼: "09:00-19:00" / "휴무" / "" → 영업시간 값. 비었거나 잘못된 형식이면 undefined */
export function parseHours(text: string): [string, string][] | null | undefined {
  const t = text.trim();
  if (t === "") return undefined;
  if (t === "휴무") return null;
  const m = t.match(/^(\d{1,2}):(\d{2})\s*[-~]\s*(\d{1,2}):(\d{2})$/);
  if (!m) return undefined;
  const pad = (h: string, mm: string) => `${h.padStart(2, "0")}:${mm}`;
  return [[pad(m[1], m[2]), pad(m[3], m[4])]];
}
