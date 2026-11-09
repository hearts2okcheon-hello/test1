"use client";

import { useState } from "react";
import { Osori } from "@/components/Osori";

// 카카오 로그인 버튼은 카카오 디자인 가이드의 색을 쓴다 (디자인 토큰 예외)
const KAKAO_YELLOW = "#FEE500";
const KAKAO_LABEL = "rgba(0, 0, 0, 0.85)";

const MESSAGES: Record<string, string> = {
  failed: "카카오 로그인이 끝나지 않았어요. 다시 눌러 주세요.",
  unavailable: "카카오 로그인이 아직 준비 중이에요. 옥천신문에 알려 주세요.",
};

/** 사장님은 카카오 계정으로 로그인해 바로 가게를 등록한다 (ADR-009) */
export function KakaoLogin({ ready, login }: { ready: boolean; login?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(login ? (MESSAGES[login] ?? MESSAGES.failed) : null);

  return (
    <section className="flex flex-col items-center gap-4 rounded-[22px] border-2 border-line bg-card px-4 py-6 text-center">
      <Osori mood="proud" size={110} className="ok-bob" />
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[26px] font-normal">사장님, 반가워요!</h1>
        <p className="text-lg leading-relaxed text-muted">카카오로 로그인하면 바로 우리 가게를 등록할 수 있어요. 한 번 로그인하면 이 휴대폰에서 계속 쓸 수 있어요.</p>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (!ready) return setError(MESSAGES.unavailable);
          setBusy(true);
          setError(null);
          window.location.href = "/auth/kakao?next=/owner";
        }}
        className="flex min-h-16 w-full items-center justify-center gap-2.5 rounded-[22px] text-xl font-bold disabled:opacity-60"
        style={{ background: KAKAO_YELLOW, color: KAKAO_LABEL }}
      >
        <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3C6.48 3 2 6.54 2 10.9c0 2.83 1.87 5.3 4.69 6.7l-.96 3.52c-.08.3.26.54.52.37l4.2-2.78c.5.06 1.02.09 1.55.09 5.52 0 10-3.54 10-7.9S17.52 3 12 3z" />
        </svg>
        {busy ? "카카오로 가는 중…" : "카카오로 시작하기"}
      </button>
      {error && <p role="alert" className="text-base font-bold text-[#A4423F]">{error}</p>}
      <p className="text-base text-muted">앱이 어려우시면 옥천신문에 전화 주세요. 대신 등록해 드려요.</p>
    </section>
  );
}
