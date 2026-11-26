"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { canSubmit, createSubmitter, submitLabel, type SubmitKind, type SubmitPhase } from "@/lib/submit";

/**
 * 저장·올리기 버튼 하나의 흐름 (ADR-028).
 * run(할 일, 끝난 뒤)을 부르면 phase 가 처리 중 → 완료로 바뀌고, 완료를 잠깐(1.2초) 보여 준 뒤 "끝난 뒤"를 한다.
 * 실패하면 phase 는 failed, error 에 알림 글이 담긴다 (쓴 내용은 그대로이고, 다시 누르면 다시 보낸다).
 * 처리 중·완료 표시 중에 또 부르면 아무 일도 하지 않는다
 */
export function useSubmit() {
  const router = useRouter();
  const [state, setState] = useState<{ phase: SubmitPhase; error: string | null }>({ phase: "idle", error: null });
  // 저장은 됐는데 완료 표시가 끝나기 전에 화면을 떠났으면, 받아 둔 화면들을 새로 받는다 (옮겨 간 화면에 고친 내용이 보이게)
  const [flow] = useState(() => createSubmitter((phase, error) => setState({ phase, error }), { onAbandon: () => router.refresh() }));

  useEffect(() => {
    flow.resume();
    return () => flow.stop();
  }, [flow]);

  return { phase: state.phase, error: state.error, locked: !canSubmit(state.phase), run: flow.run };
}

/**
 * 저장·올리기 버튼 (ADR-028). 크기·자리·모서리는 className 으로 화면마다 정하고, 안의 표시와 글자만 상태에 따라 바뀐다:
 * 기본(글자만) → 처리 중(도는 고리 + "저장 중…") → 완료(체크 + "저장했어요!", 바탕이 한 단계 진해진다) · 실패(다시 시도).
 * 화면을 가리는 로딩 창은 없다. 처리 중·완료 표시 중에는 눌러도 아무 일도 없다 (색은 흐려지지 않는다).
 * disabled 는 아직 누를 수 없을 때(필요한 칸이 비었을 때), idleLabel 은 기본 상태에서만 쓰는 화면별 글
 */
export function SubmitButton({
  kind,
  phase,
  idleLabel,
  disabled = false,
  type = "submit",
  onClick,
  className = "",
}: {
  kind: SubmitKind;
  phase: SubmitPhase;
  idleLabel?: string;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
  className?: string;
}) {
  const locked = !canSubmit(phase);
  const label = submitLabel(kind, phase, idleLabel);

  return (
    <>
      <button
        type={type}
        disabled={disabled && !locked}
        aria-disabled={locked || undefined}
        data-phase={phase}
        onClick={(e) => {
          if (locked) return e.preventDefault();
          onClick?.();
        }}
        className={`ok-submit flex items-center justify-center border-2 border-sage-deep bg-sage text-white data-[phase=done]:bg-sage-deep ${className}`}
      >
        <span aria-hidden className="ok-submit-mark">
          <span className="ok-submit-icon ok-submit-spin">
            <span className="ok-submit-ring" />
          </span>
          <svg className="ok-submit-icon ok-submit-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} />
          </svg>
          <svg className="ok-submit-icon ok-submit-retry" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19.5 5v5h-5" />
            <path d="M19 10a7.5 7.5 0 1 0 .5 5" />
          </svg>
        </span>
        {/* 글자가 바뀔 때마다 새로 그려 살짝 떠오르게 한다 (기본 상태 안에서 바뀌는 안내 글은 그냥 바뀐다) */}
        <span key={phase === "idle" ? "idle" : label} className="ok-submit-label">
          {label}
        </span>
      </button>
      <span role="status" className="sr-only">
        {locked ? label : ""}
      </span>
    </>
  );
}

/** 실패했을 때 버튼 위에 보이는 알림. 쓴 내용은 그대로 있고, 버튼은 "다시 시도"가 된다 */
export function SubmitError({ message, className = "" }: { message: string | null; className?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className={`rounded-2xl bg-coral-soft px-3.5 py-2.5 text-base leading-normal break-keep text-danger ${className}`}>
      {message}
    </p>
  );
}
