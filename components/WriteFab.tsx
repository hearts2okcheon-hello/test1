import Link from "next/link";

/** 오른쪽 아래 쓰기 버튼 */
export function WriteFab() {
  return (
    <Link
      href="/write"
      aria-label="소식 쓰기"
      className="fixed right-5 bottom-[calc(96px+env(safe-area-inset-bottom))] z-30 inline-flex h-[58px] items-center gap-2 rounded-full border-2 border-yellow-deep bg-yellow pr-[22px] pl-[18px] font-display text-[19px] shadow-[0_5px_0_var(--color-yellow-deep)]"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 20h4L19 9l-4-4L4 16z" />
        <path d="M13.5 6.5l4 4" />
      </svg>
      쓰기
    </Link>
  );
}
