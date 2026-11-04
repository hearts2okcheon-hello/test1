"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Osori } from "@/components/Osori";
import { errorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";

const DEV_EMAIL = process.env.NEXT_PUBLIC_DEV_EMAIL_LOGIN === "true";

export default function OwnerLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function kakao() {
    setError(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/owner` },
    });
    if (error) setError(errorMessage(error));
  }

  async function emailLogin(signUp: boolean) {
    setError(null);
    const supabase = createClient();
    const { error } = signUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) return setError(error.message);
    router.push("/owner");
    router.refresh();
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-10 text-center">
      <Osori mood="proud" size={130} className="ok-bob" />
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[28px] font-normal">사장님, 반가워요!</h1>
        <p className="text-base leading-relaxed text-muted">로그인하면 버튼 하나로 오늘 가게 소식을 알릴 수 있어요.</p>
      </div>

      <button
        type="button"
        onClick={kakao}
        className="flex min-h-[58px] w-full items-center justify-center gap-2 rounded-[22px] bg-[#FEE500] text-lg font-bold text-[#191600]"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
          <path fill="#191600" d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7l-1 3.6c-.1.3.3.6.6.4l4.2-2.8c.5.1 1 .1 1.5.1 5.5 0 10-3.6 10-8S17.5 3 12 3z" />
        </svg>
        카카오로 시작하기
      </button>

      {DEV_EMAIL && (
        <form
          className="flex w-full flex-col gap-2 rounded-[22px] border-2 border-dashed border-line-strong p-4 text-left"
          onSubmit={(e) => {
            e.preventDefault();
            emailLogin(false);
          }}
        >
          <span className="text-xs font-bold text-muted">개발용 이메일 로그인</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" className="min-h-12 rounded-2xl border-2 border-line bg-white px-3" />
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" className="min-h-12 rounded-2xl border-2 border-line bg-white px-3" />
          <div className="flex gap-2">
            <button type="submit" className="min-h-12 flex-1 rounded-2xl border-2 border-yellow-deep bg-yellow font-bold">로그인</button>
            <button type="button" onClick={() => emailLogin(true)} className="min-h-12 flex-1 rounded-2xl border-2 border-line bg-card font-bold">가입</button>
          </div>
        </form>
      )}

      {error && <p className="text-sm font-bold text-[#A4423F]">{error}</p>}
      <p className="text-sm text-muted">로그인이 어려우시면 옥천신문에 전화 주세요. 대신 올려드려요.</p>
    </main>
  );
}
