"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Osori } from "@/components/Osori";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-10">
      <Osori mood="work" size={120} />
      <h1 className="font-display text-[26px] font-normal">옥천신문 관리자 로그인</h1>
      <form
        className="flex w-full flex-col gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          const { error } = await createClient().auth.signInWithPassword({ email, password });
          if (error) return setError("이메일 또는 비밀번호를 확인해 주세요.");
          router.push("/admin");
          router.refresh();
        }}
      >
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" aria-label="이메일" className="min-h-12 rounded-2xl border-2 border-line bg-white px-3" />
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" aria-label="비밀번호" className="min-h-12 rounded-2xl border-2 border-line bg-white px-3" />
        <button type="submit" className="min-h-14 rounded-[22px] border-2 border-sage-deep bg-sage font-display text-xl text-white">
          로그인
        </button>
      </form>
      {error && <p className="text-sm font-bold text-[#A4423F]">{error}</p>}
    </main>
  );
}
