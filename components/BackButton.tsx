"use client";

import { useRouter } from "next/navigation";

/** 들어온 화면으로 돌아간다. 링크로 바로 들어왔으면 홈으로 */
export function BackButton({ label = "뒤로" }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        if (document.referrer.startsWith(window.location.origin)) router.back();
        else router.push("/");
      }}
      className="flex size-[46px] shrink-0 items-center justify-center rounded-full border-2 border-line bg-card"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </button>
  );
}
