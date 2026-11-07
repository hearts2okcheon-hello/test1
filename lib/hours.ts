import type { RegularHours, Weekday } from "./types";

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

const DAY_ORDER: [Weekday, string][] = [
  ["mon", "월요일"], ["tue", "화요일"], ["wed", "수요일"], ["thu", "목요일"], ["fri", "금요일"], ["sat", "토요일"], ["sun", "일요일"],
];

export type HoursLine = { days: string; text: string; closed: boolean };

/** 영업시간을 붙어 있는 요일끼리 묶는다: "월요일~토요일 09:00 - 20:00", "일요일 휴무" */
export function summarizeHours(hours: RegularHours | null): HoursLine[] {
  if (!hours) return [];
  const rows = DAY_ORDER.filter(([d]) => d in hours).map(([d, label]) => {
    const ranges = hours[d];
    const closed = !ranges || ranges.length === 0;
    return { label, closed, text: closed ? "휴무" : ranges.map(([a, b]) => `${a} - ${b}`).join(", ") };
  });
  const out: { first: string; last: string; text: string; closed: boolean }[] = [];
  for (const r of rows) {
    const prev = out[out.length - 1];
    if (prev && prev.text === r.text) prev.last = r.label;
    else out.push({ first: r.label, last: r.label, text: r.text, closed: r.closed });
  }
  return out.map((g) => ({ days: g.first === g.last ? g.first : `${g.first}~${g.last}`, text: g.text, closed: g.closed }));
}

/** 카카오맵 검색 링크. API 키가 필요 없다 */
export function kakaoMapUrl(address: string): string {
  return `https://map.kakao.com/link/search/${encodeURIComponent(address.trim())}`;
}

/** "01012345678" → "010-1234-5678", "0432001234" → "043-200-1234", "023001234" → "02-300-1234" */
export function formatPhone(phone: string): string {
  const v = phone.replace(/\D/g, "").slice(0, 11);
  if (v.startsWith("02")) return v.length > 5 ? `${v.slice(0, 2)}-${v.slice(2, v.length - 4)}-${v.slice(-4)}` : v;
  if (v.length > 7) return `${v.slice(0, 3)}-${v.slice(3, v.length - 4)}-${v.slice(-4)}`;
  if (v.length > 3) return `${v.slice(0, 3)}-${v.slice(3)}`;
  return v;
}

/** 5000 → "5,000원" */
export function formatWon(price: number): string {
  return `${price.toLocaleString("ko-KR")}원`;
}
