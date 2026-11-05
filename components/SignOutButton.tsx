"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ label = "로그아웃" }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await createClient().auth.signOut();
        router.push("/");
        router.refresh();
      }}
      className="min-h-11 shrink-0 rounded-2xl border-2 border-line bg-card px-3.5 text-sm font-bold text-muted"
    >
      {label}
    </button>
  );
}
