"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { AFTER_SIGN_OUT, SIGN_OUT_COPY, SPINNER_AFTER_MS, canPress, runSignOut, showsSpinner, type SignOutPhase } from "@/lib/signout";
import { createClient } from "@/lib/supabase/client";

const WIDE = "flex min-h-16 w-full items-center justify-center gap-2.5 rounded-[20px] border-2 border-line bg-white text-[17px] font-bold text-ink";
const SMALL = "min-h-11 shrink-0 rounded-2xl border-2 border-line bg-card px-3.5 text-sm font-bold text-muted";

/**
 * 로그아웃 버튼 (ADR-027). 누르면 바로 나가지 않고 확인 창을 먼저 띄운다.
 * wide 는 내 공간 맨 아래의 가로를 다 쓰는 버튼(아이콘과 글자가 가운데), 아니면 작은 버튼(관리자 화면 머리)
 */
export function SignOutButton({ label = SIGN_OUT_COPY.confirm, wide = false }: { label?: string; wide?: boolean }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button ref={trigger} type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={wide ? WIDE : SMALL}>
        {wide && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
            <path d="M13 4H6v16h7" />
            <path d="M10.5 12H20" />
            <path d="M16.5 8.5L20 12l-3.5 3.5" />
          </svg>
        )}
        {label}
      </button>
      {open && (
        <SignOutDialog
          onClose={() => {
            setOpen(false);
            trigger.current?.focus();
          }}
        />
      )}
    </>
  );
}

const endSession = () => createClient().auth.signOut();
// 화면을 통째로 새로 받는다: 로그인했을 때 받아 둔 화면이 모두 지워지고, 지금 화면은 기록에서 홈으로 바뀐다 ("뒤로"로 돌아올 수 없다).
// 화면을 옮길 때 뜨는 오소리 로딩도 거치지 않는다
const goHome = () => window.location.replace(AFTER_SIGN_OUT);

/**
 * 로그아웃 확인 창: "로그아웃 하시겠어요?" · 취소 / 로그아웃.
 * 로그아웃을 누르면 세션을 끝내고 비로그인 홈으로 간다. 금방 끝나면 아무 표시 없이 넘어가고, 늦어질 때만 버튼에 스피너가 돈다.
 * 처리하는 동안에는 두 버튼 모두 눌리지 않는다. 실패하면 창 안에서 알리고 "다시 시도"를 준다.
 * signOut · leave 는 화면 확인용으로 바꿔 끼울 수 있다 (기본은 실제 로그아웃과 홈으로 가기)
 */
export function SignOutDialog({
  onClose,
  signOut = endSession,
  leave = goHome,
}: {
  onClose: () => void;
  signOut?: () => Promise<{ error: unknown }>;
  leave?: () => void;
}) {
  const titleId = useId();
  const detailId = useId();
  const box = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<SignOutPhase>("ask");
  const [late, setLate] = useState(false);
  // 상태가 화면에 반영되기 전에 한 번 더 눌려도 한 번만 처리한다
  const running = useRef(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const spinning = showsSpinner(phase, late ? SPINNER_AFTER_MS : 0);
  const locked = !canPress(phase);

  async function confirm() {
    if (running.current) return;
    running.current = true;
    setPhase("working");
    timer.current = window.setTimeout(() => setLate(true), SPINNER_AFTER_MS);
    // 끝난 뒤에도 화면이 넘어갈 때까지는 처리 중으로 둔다 (그 사이에 다시 눌리지 않게)
    if ((await runSignOut(signOut)) === "done") return leave();
    window.clearTimeout(timer.current);
    running.current = false;
    setLate(false);
    setPhase("failed");
  }

  function close() {
    if (!locked) onClose();
  }

  // Esc 는 취소. Tab 은 창 안의 두 버튼 사이에서만 돈다
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") return close();
    if (e.key !== "Tab") return;
    const buttons = Array.from(box.current?.querySelectorAll("button") ?? []);
    if (buttons.length === 0) return;
    e.preventDefault();
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    buttons[(at + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
  }

  return createPortal(
    <div
      data-no-swipe
      onKeyDown={onKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      className="fixed inset-0 z-[150] flex touch-none items-center justify-center bg-ink/40 px-5"
    >
      <div
        ref={box}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={detailId}
        aria-busy={locked}
        className="ok-pop flex w-full max-w-[380px] flex-col gap-3 rounded-[22px] border-2 border-line bg-card px-4 pt-6 pb-4 text-center"
      >
        <h2 id={titleId} className="font-display text-[24px] font-normal">{SIGN_OUT_COPY.title}</h2>
        <p id={detailId} className="text-base leading-relaxed break-keep text-muted">{SIGN_OUT_COPY.detail}</p>
        {phase === "failed" && (
          <p role="alert" className="rounded-2xl bg-coral-soft px-3.5 py-2.5 text-base leading-normal break-keep text-danger">
            {SIGN_OUT_COPY.failed}
          </p>
        )}
        <span role="status" className="sr-only">{spinning ? "로그아웃하는 중이에요" : ""}</span>
        <div className="mt-1 flex gap-2">
          <button type="button" autoFocus aria-disabled={locked} onClick={close} className={`min-h-16 flex-1 rounded-[22px] border-2 border-line bg-white font-display text-xl ${spinning ? "opacity-50" : ""}`}>
            {SIGN_OUT_COPY.cancel}
          </button>
          <button type="button" aria-disabled={locked} onClick={confirm} className="flex min-h-16 flex-1 items-center justify-center gap-2.5 rounded-[22px] border-2 border-yellow-deep bg-yellow font-display text-xl">
            {spinning && <span aria-hidden className="size-5 shrink-0 animate-spin rounded-full border-[3px] border-ink/25 border-t-ink motion-reduce:animate-none" />}
            {spinning ? SIGN_OUT_COPY.working : phase === "failed" ? SIGN_OUT_COPY.retry : SIGN_OUT_COPY.confirm}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
