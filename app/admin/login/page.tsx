"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Osori } from "@/components/Osori";
import { pushWithLoading } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="flex flex-1 flex-col gap-5 px-6 pt-4 pb-10">
      <Link href="/owner" className="flex min-h-12 w-fit items-center gap-1.5 rounded-2xl border-2 border-line bg-card px-3.5 text-base font-bold">
        <span aria-hidden>‹</span> 내 가게로 돌아가기
      </Link>
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <Osori mood="work" size={120} />
        <h1 className="font-display text-[26px] font-normal">옥천신문 관리자 로그인</h1>
        <form
          className="flex w-full flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            const { error } = await createClient().auth.signInWithPassword({ email, password });
            if (error) return setError("이메일 또는 비밀번호를 확인해 주세요.");
            pushWithLoading(router, "/admin");
            router.refresh();
          }}
        >
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" aria-label="이메일" className="min-h-12 rounded-2xl border-2 border-line bg-white px-3" />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              aria-label="비밀번호"
              autoComplete="current-password"
              className="min-h-12 w-full rounded-2xl border-2 border-line bg-white pr-12 pl-3"
            />
            <button
              type="button"
              aria-label={showPassword ? "비밀번호 가리기" : "비밀번호 보기"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-0 right-0 flex size-12 items-center justify-center text-muted"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
                <circle cx="12" cy="12" r="3" />
                {showPassword && <path d="M4 4l16 16" />}
              </svg>
            </button>
          </div>
          <button type="submit" className="min-h-14 rounded-[22px] border-2 border-sage-deep bg-sage font-display text-xl text-white">
            로그인
          </button>
        </form>
        {error && <p role="alert" className="text-sm font-bold text-[#A4423F]">{error}</p>}
      </div>
    </main>
  );
}
