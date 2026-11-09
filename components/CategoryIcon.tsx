import type { ReactNode } from "react";
import type { CategoryId } from "@/lib/categories";

const INK = "#5B4636";
const line = { stroke: INK, strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** 카테고리 그림. 벡터라 어떤 화면에서도 선명하다 */
const ICONS: Record<CategoryId, ReactNode> = {
  // 커피
  cafe: (
    <>
      <path d="M26 9c-2 3 2 4 0 8M36 9c-2 3 2 4 0 8" fill="none" {...line} />
      <path d="M15 24h32v14a13 13 0 0 1-13 13h-6a13 13 0 0 1-13-13z" fill="#FFFFFF" {...line} />
      <path d="M17 24h28v6H17z" fill="#8A5A3C" />
      <path d="M15 24h32" fill="none" {...line} />
      <path d="M47 28h3a6 6 0 0 1 0 12h-4" fill="none" {...line} />
      <path d="M11 56h40" fill="none" {...line} />
    </>
  ),
  // 밥
  korean: (
    <>
      <path d="M14 32c0-11 9-19 18-19s18 8 18 19z" fill="#FFFFFF" {...line} />
      <path d="M24 22l2 2M33 19l2 2M40 26l2 2M29 28l2 2" fill="none" {...line} strokeWidth={2} />
      <path d="M9 32h46c0 12-8 21-17 21H26C17 53 9 44 9 32z" fill="#7FA66E" {...line} />
      <path d="M20 40h24" fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" />
    </>
  ),
  // 짜장면
  chinese: (
    <>
      <path d="M13 31c2-9 10-14 19-14s17 5 19 14z" fill="#3F2C20" {...line} />
      <path d="M20 27c4-5 7 3 11-2s7 3 12-1" fill="none" stroke="#8A6A52" strokeWidth={2.2} strokeLinecap="round" />
      <path d="M36 15l5 4-4 4-5-4z" fill="#8CC06B" {...line} strokeWidth={2} />
      <path d="M9 31h46c0 13-9 22-18 22H27C18 53 9 44 9 31z" fill="#E8604C" {...line} />
      <path d="M22 41h20M26 46h12" fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" />
    </>
  ),
  // 초밥
  japanese: (
    <>
      <path d="M12 38c0-5 5-8 20-8s20 3 20 8v6c0 4-7 7-20 7s-20-3-20-7z" fill="#FFFFFF" {...line} />
      <path d="M10 31c0-9 11-15 22-15s22 6 22 15c0 4-9 6-22 6s-22-2-22-6z" fill="#F58F65" {...line} />
      <path d="M21 20c3 3 4 9 3 16M32 17c3 4 4 12 3 20M43 20c3 3 4 9 3 15" fill="none" stroke="#FFD2BC" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M26 35h12v16H26z" fill="#3D4F3A" {...line} />
    </>
  ),
  // 파스타
  western: (
    <>
      <ellipse cx="32" cy="46" rx="25" ry="9" fill="#FFFFFF" {...line} />
      <path d="M16 44c1-10 8-16 16-16s15 6 16 16c-9 5-23 5-32 0z" fill="#F2C65C" {...line} />
      <path d="M21 41c3-7 7-9 11-9M26 45c1-6 6-10 13-9M33 45c1-3 5-6 10-5" fill="none" stroke="#C4902E" strokeWidth={2.2} strokeLinecap="round" />
      <circle cx="33" cy="28" r="4.5" fill="#D9503F" {...line} strokeWidth={2} />
      <path d="M46 9v15M51 9v15M56 9v15M46 24c0 4 10 4 10 0M51 27l-5 18" fill="none" {...line} />
    </>
  ),
  // 떡볶이
  bunsik: (
    <>
      <path d="M9 33h46c0 12-9 20-18 20H27C18 53 9 45 9 33z" fill="#FFFFFF" {...line} />
      <path d="M13 33c3-8 11-12 19-12s16 4 19 12z" fill="#E2502F" {...line} />
      <rect x="18" y="20" width="16" height="7.5" rx="3.7" transform="rotate(-18 26 24)" fill="#FFF3DE" {...line} strokeWidth={2} />
      <rect x="31" y="15" width="16" height="7.5" rx="3.7" transform="rotate(22 39 19)" fill="#FFF3DE" {...line} strokeWidth={2} />
      <rect x="29" y="25" width="16" height="7.5" rx="3.7" transform="rotate(-6 37 29)" fill="#FFF3DE" {...line} strokeWidth={2} />
      <path d="M20 42h24" fill="none" stroke="#E2502F" strokeWidth={2.4} strokeLinecap="round" />
    </>
  ),
  // 치킨
  chicken: (
    <>
      <path d="M40 8c10 0 16 8 15 17-1 11-12 18-22 16l-6-6C25 25 30 8 40 8z" fill="#D98B3A" {...line} />
      <path d="M39 16c-4 2-6 6-6 10M47 15c2 2 3 5 2 8" fill="none" stroke="#F4BE78" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M27 35L16 46" fill="none" stroke={INK} strokeWidth={9.5} strokeLinecap="round" />
      <path d="M27 35L16 46" fill="none" stroke="#FFF3DE" strokeWidth={5} strokeLinecap="round" />
      <circle cx="11" cy="46" r="4.6" fill="#FFF3DE" {...line} strokeWidth={2.2} />
      <circle cx="17" cy="53" r="4.6" fill="#FFF3DE" {...line} strokeWidth={2.2} />
      <path d="M13 47.5l3 3" fill="none" stroke="#FFF3DE" strokeWidth={5} strokeLinecap="round" />
    </>
  ),
  // 머핀
  bakery: (
    <>
      <path d="M17 33h30l-4 21H21z" fill="#F2B8C0" {...line} />
      <path d="M26 35l2 18M32 35v18M38 35l-2 18" fill="none" stroke="#D98896" strokeWidth={2.2} strokeLinecap="round" />
      <path d="M13 33c-3-9 5-14 9-13 2-7 18-8 21 0 5-1 11 4 8 13-1 2-3 2-4 2H17c-2 0-3 0-4-2z" fill="#A9744B" {...line} />
      <circle cx="26" cy="24" r="1.9" fill="#FFF3DE" />
      <circle cx="37" cy="21" r="1.9" fill="#FFF3DE" />
      <circle cx="41" cy="29" r="1.9" fill="#FFF3DE" />
      <circle cx="31" cy="30" r="1.9" fill="#FFF3DE" />
    </>
  ),
  // 집
  etc: (
    <>
      <path d="M43 12h7v13h-7z" fill="#C98B5B" {...line} />
      <path d="M14 29h36v25H14z" fill="#FFF8E6" {...line} />
      <path d="M7 32L32 10l25 22z" fill="#D9604C" {...line} />
      <path d="M27 54V40h10v14" fill="#A9744B" {...line} />
      <rect x="18.5" y="35" width="6" height="6" fill="#BFE0F2" {...line} strokeWidth={2} />
      <rect x="39.5" y="35" width="6" height="6" fill="#BFE0F2" {...line} strokeWidth={2} />
    </>
  ),
};

export function CategoryIcon({ id, size = 46 }: { id: CategoryId; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="block shrink-0">
      {ICONS[id]}
    </svg>
  );
}
