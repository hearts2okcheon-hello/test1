"use client";

import { Osori } from "@/components/Osori";
import { MISSING_ENV } from "@/lib/supabase/env";

/** 화면을 그리다 문제가 생겼을 때. 설정 누락이면 무엇을 고칠지 알려 준다 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const missingEnv = error.message === MISSING_ENV;
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <Osori mood="surprise" size={120} />
      <h1 className="font-display text-2xl font-normal">{missingEnv ? "아직 연결 준비가 안 됐어요" : "잠깐 문제가 생겼어요"}</h1>
      <p className="text-base leading-relaxed text-muted">{missingEnv ? MISSING_ENV : "잠시 뒤 다시 시도해 주세요."}</p>
      <button type="button" onClick={reset} className="min-h-12 rounded-2xl border-2 border-line bg-card px-5 font-bold">
        다시 시도
      </button>
    </main>
  );
}
