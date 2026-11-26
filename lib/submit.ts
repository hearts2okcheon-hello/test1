// 저장·올리기 버튼 (ADR-028): 누르면 버튼 안에서 기본 → 처리 중(스피너) → 완료(체크)로 바뀐다.
// 화면을 가리는 로딩 창은 띄우지 않는다. 실패하면 쓴 내용은 그대로 두고, 알린 뒤 다시 시도하게 한다.
// 화면은 components/SubmitButton.tsx

import { errorMessage } from "./errors";

/** 무엇을 하는 버튼인가: 정보·캘린더 저장 · 글 올리기 · 처음 등록 */
export type SubmitKind = "save" | "post" | "register";
/** 버튼의 상태: 기본 · 처리 중 · 완료(잠깐 보여 준다) · 실패 */
export type SubmitPhase = "idle" | "working" | "done" | "failed";

/** 상태마다 버튼에 적는 글. 화면마다 따로 짓지 않고 여기 것을 쓴다 */
export const SUBMIT_COPY: Record<SubmitKind, { idle: string; working: string; done: string }> = {
  save: { idle: "저장하기", working: "저장 중…", done: "저장했어요!" },
  post: { idle: "올리기", working: "올리는 중…", done: "올렸어요!" },
  register: { idle: "등록하기", working: "등록하는 중…", done: "등록했어요!" },
};
export const SUBMIT_RETRY = "다시 시도";

/** 아이콘과 글자가 바뀌는 움직임의 길이 (app/globals.css 의 --ok-submit-ms 와 같은 값) */
export const SUBMIT_TRANSITION_MS = 250;
/** 완료(체크 + "저장했어요!")를 보여 주는 시간. 이 뒤에 화면을 옮기거나 기본 상태로 돌아온다 */
export const SUBMIT_DONE_MS = 1200;

/** 버튼에 적을 글. idleLabel 은 기본 상태에서만 쓰는 화면별 글(처음 등록 화면의 이름, 아직 누를 수 없을 때의 안내) */
export function submitLabel(kind: SubmitKind, phase: SubmitPhase, idleLabel?: string): string {
  if (phase === "working") return SUBMIT_COPY[kind].working;
  if (phase === "done") return SUBMIT_COPY[kind].done;
  if (phase === "failed") return SUBMIT_RETRY;
  return idleLabel ?? SUBMIT_COPY[kind].idle;
}

/** 처리 중과 완료 표시 중에는 다시 보내지 않는다 (같은 글이 두 번 올라가지 않게) */
export function canSubmit(phase: SubmitPhase): boolean {
  return phase === "idle" || phase === "failed";
}

/** 글을 올린 뒤 가는 곳: 소통광장에서 그 글이 놓이는 줄 (새 글이 맨 위에 보인다) */
export function afterPostHref(what: "store" | "story"): string {
  return `/news?tab=${what === "store" ? "owner" : "community"}`;
}

export type SubmitPlan = {
  /** 성공이 확인된 바로 그때 할 일 (완료 표시와 함께) */
  onDone?: () => void;
  /** 완료 표시가 끝난 뒤 할 일: 화면 옮기기 · 칸 비우기. 그 사이에 화면을 떠났으면 하지 않는다 */
  then?: () => void;
  /** 이 화면에 남는다: 끝나면 버튼이 기본 상태로 돌아온다. 화면을 옮길 때는 옮겨질 때까지 완료 그대로 둔다 (다시 눌리지 않게) */
  stay?: boolean;
};

/**
 * 버튼 하나의 흐름을 맡는다. report 로 상태(와 실패했을 때의 알림 글)를 알려 준다.
 * run(task, plan): task 가 끝까지 성공해야 완료가 되고, 완료를 잠깐 보여 준 뒤 plan.then 을 한다. task 가 터지면 실패.
 * 처리 중·완료 표시 중에 또 부르면 아무 일도 하지 않는다.
 * onAbandon: 저장은 됐는데 완료 표시가 끝나기 전에 화면을 떠났을 때 한 번 부른다 (받아 둔 화면을 새로 받게 하는 데 쓴다)
 */
export function createSubmitter(
  report: (phase: SubmitPhase, error: string | null) => void,
  opts: { doneMs?: number; explain?: (e: unknown) => string; onAbandon?: () => void } = {},
) {
  const doneMs = opts.doneMs ?? SUBMIT_DONE_MS;
  const explain = opts.explain ?? errorMessage;
  let phase: SubmitPhase = "idle";
  let alive = true;
  // 저장은 끝났고 다음 일(then)은 아직 하지 않았다
  let holding = false;

  function set(next: SubmitPhase, error: string | null = null) {
    phase = next;
    if (alive) report(next, error);
  }

  return {
    phase: () => phase,

    /** 성공하면 true. 실패했거나, 이미 처리 중이라 무시했으면 false */
    async run(task: () => Promise<unknown>, plan: SubmitPlan = {}): Promise<boolean> {
      if (!canSubmit(phase)) return false;
      set("working");
      try {
        await task();
      } catch (e) {
        set("failed", explain(e));
        return false;
      }
      if (!alive) {
        // 처리하는 동안 화면을 떠났다
        opts.onAbandon?.();
        return true;
      }
      holding = true;
      set("done");
      plan.onDone?.();
      await new Promise<void>((resolve) => setTimeout(resolve, doneMs));
      if (!holding) return true; // 완료 표시 도중에 떠났다 (stop 이 이미 처리했다)
      holding = false;
      plan.then?.();
      if (plan.stay) set("idle");
      return true;
    },

    /** 화면이 사라질 때 */
    stop() {
      alive = false;
      if (!holding) return;
      holding = false;
      opts.onAbandon?.();
    },

    /** 화면이 다시 붙을 때 (개발 모드는 화면을 한 번 뗐다가 다시 붙인다) */
    resume() {
      alive = true;
    },
  };
}
