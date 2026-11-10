"use client";

import { useEffect, useState } from "react";
import { MEMO_CHIPS, MEMO_MAX, REPORT_STYLES } from "@/lib/signs";
import type { OwnerQuestion } from "@/lib/types";
import { TimeAgo } from "./TimeAgo";

const HIDE_KEY = "ok-report-alert-hidden";

function Bell({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`size-6 shrink-0 ${className}`} fill="currentColor">
      <path d="M12 2.5a1.6 1.6 0 0 1 1.6 1.6v.6a6.4 6.4 0 0 1 4.8 6.2v3.6l1.7 2.6a.9.9 0 0 1-.8 1.4H4.7a.9.9 0 0 1-.8-1.4l1.7-2.6v-3.6a6.4 6.4 0 0 1 4.8-6.2v-.6A1.6 1.6 0 0 1 12 2.5zm-2.6 17h5.2a2.6 2.6 0 0 1-5.2 0z" />
    </svg>
  );
}

/**
 * 사장님 화면 맨 위 알림 띠: 이웃 제보에 답할 때까지 붙어 있다.
 * x 로 닫으면 같은 제보에 대해서는 다시 뜨지 않고, 새 제보가 오면 다시 뜬다.
 */
export function ReportAlert({
  questions, busy, onReply, className = "",
}: {
  questions: OwnerQuestion[];
  busy: boolean;
  onReply: (open: boolean, memo: string) => Promise<boolean>;
  className?: string;
}) {
  const key = questions.map((q) => q.id).sort().join(",");
  const [hidden, setHidden] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [choice, setChoice] = useState<boolean | null>(null);
  const [memo, setMemo] = useState("");

  useEffect(() => {
    let saved = "";
    try {
      saved = window.localStorage.getItem(HIDE_KEY) ?? "";
    } catch {}
    setHidden(saved === key);
  }, [key]);

  if (questions.length === 0) return null;

  function close() {
    try {
      window.localStorage.setItem(HIDE_KEY, key);
    } catch {}
    setHidden(true);
  }

  async function send() {
    if (choice === null) return;
    if (await onReply(choice, memo.trim())) {
      setSheet(false);
      setChoice(null);
      setMemo("");
    }
  }

  return (
    <>
      {!hidden && (
        <div className={`sticky top-2 z-40 ${className}`}>
          <div className="ok-pop relative flex items-center rounded-[22px] border-2 border-yellow-deep bg-yellow shadow-[0_4px_0_var(--color-yellow-deep)]">
            <button type="button" onClick={() => setSheet(true)} className="flex min-h-16 flex-1 items-center justify-center gap-2 py-2 pr-10 pl-4 font-display text-xl text-ink">
              <Bell className="ok-ring" />
              이웃 제보가 왔어요
              <Bell className="ok-ring" />
            </button>
            <button type="button" aria-label="알림 닫기" onClick={close} className="absolute top-1 right-1 flex size-11 items-center justify-center rounded-full text-2xl leading-none text-ink/70">
              ×
            </button>
          </div>
        </div>
      )}

      {sheet && (
        <div role="dialog" aria-modal="true" aria-labelledby="reply-title" className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/30 px-3 pb-3 sm:items-center" onClick={() => setSheet(false)}>
          <div className="ok-pop relative flex max-h-[90dvh] w-full max-w-[440px] flex-col gap-3.5 overflow-y-auto rounded-[28px] border-2 border-line bg-card px-5 pt-5 pb-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label="닫기" onClick={() => setSheet(false)} className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-full text-2xl leading-none text-muted">
              ×
            </button>
            <h2 id="reply-title" className="flex items-center gap-2 font-display text-[24px] font-normal">
              <Bell className="text-yellow-deep" />
              이웃의 제보가 왔어요!
            </h2>

            <ul className="flex flex-col gap-1.5">
              {questions.map((q) => (
                <li key={q.id} className="rounded-2xl bg-cream px-3.5 py-2.5 text-[17px] leading-snug">
                  <b>&ldquo;{REPORT_STYLES[q.kind].label}&rdquo;</b>
                  <span className="block text-sm text-muted">
                    <TimeAgo iso={q.created_at} />
                    {q.agree_count > 0 ? ` · 이웃 ${q.agree_count}명도 봤어요` : ""}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2">
              <span className="text-lg font-bold">오늘 가게는요</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-pressed={choice === true}
                  onClick={() => setChoice(true)}
                  className={`min-h-16 flex-1 rounded-[18px] border-2 text-lg font-bold ${choice === true ? "border-sage-deep bg-sage text-white" : "border-line bg-white"}`}
                >
                  열었어요
                </button>
                <button
                  type="button"
                  aria-pressed={choice === false}
                  onClick={() => setChoice(false)}
                  className={`min-h-16 flex-1 rounded-[18px] border-2 text-lg font-bold ${choice === false ? "border-[#A4423F] bg-coral text-white" : "border-line bg-white"}`}
                >
                  오늘 쉬어요
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="reply-memo" className="text-lg font-bold">
                한 줄 쪽지 <span className="text-base font-normal text-muted">(안 써도 돼요)</span>
              </label>
              <input
                id="reply-memo"
                value={memo}
                maxLength={MEMO_MAX}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="예) 내일은 정상 영업해요"
                className="min-h-14 rounded-2xl border-2 border-line bg-white px-3.5 text-lg"
              />
              <div className="flex flex-wrap gap-1.5">
                {MEMO_CHIPS.map((c) => (
                  <button key={c} type="button" onClick={() => setMemo(c)} className="min-h-10 rounded-full border-2 border-line bg-cream px-3 text-[15px]">
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={busy || choice === null}
              onClick={send}
              className="min-h-16 rounded-[20px] border-2 border-yellow-deep bg-yellow font-display text-xl disabled:opacity-50"
            >
              {busy ? "보내는 중…" : choice === null ? "열었는지 쉬는지 골라 주세요" : "이웃에게 알리기"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
