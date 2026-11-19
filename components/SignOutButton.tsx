"use client";

import { useRouter } from "next/navigation";
import { pushWithLoading } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";

/** plain 이면 테두리 없이 아이콘과 글자만 (내 공간 맨 아래) */
export function SignOutButton({ label = "로그아웃", plain = false }: { label?: string; plain?: boolean }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await createClient().auth.signOut();
        pushWithLoading(router, "/");
        router.refresh();
      }}
      className={plain ? "flex min-h-12 shrink-0 items-center gap-2 rounded-2xl px-4 text-base font-bold text-muted" : "min-h-11 shrink-0 rounded-2xl border-2 border-line bg-card px-3.5 text-sm font-bold text-muted"}
    >
      {plain && (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M13 4H6v16h7" />
          <path d="M10.5 12H20" />
          <path d="M16.5 8.5L20 12l-3.5 3.5" />
        </svg>
      )}
      {label}
    </button>
  );
}
