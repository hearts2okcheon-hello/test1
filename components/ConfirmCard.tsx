"use client";

import { REPORT_STYLES } from "@/lib/signs";
import type { ReportKind } from "@/lib/types";
import { Osori } from "./Osori";
import { TimeAgo } from "./TimeAgo";

/** 이웃 제보 확인 질문 — 네 / 아니요 (MVP ②) */
export function ConfirmCard({
  kind,
  createdAt,
  agreeCount,
  storeName,
  busy,
  onAnswer,
}: {
  kind: ReportKind;
  createdAt: string;
  agreeCount: number;
  storeName?: string;
  busy?: boolean;
  onAnswer: (yes: boolean) => void;
}) {
  const r = REPORT_STYLES[kind];
  return (
    <section className="flex flex-col gap-2.5 rounded-[22px] border-2 border-yellow-line bg-cream px-4 py-3.5">
      <div className="flex items-center gap-2.5">
        <Osori mood="curious" size={54} />
        <span className="flex-1 text-sm leading-normal">
          <TimeAgo iso={createdAt} /> 이웃이 {storeName ? `${storeName}에 대해 ` : ""}
          <b>&ldquo;{r.label}&rdquo;</b>라고 알려줬어요
          {agreeCount > 0 ? ` (이웃 ${agreeCount}명도 봤어요)` : ""}
        </span>
      </div>
      <span className="font-display text-[22px] leading-snug">{storeName ? r.question : `사장님, ${r.question}`}</span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onAnswer(true)}
          className="min-h-[54px] flex-1 rounded-[18px] border-2 border-yellow-deep bg-yellow text-base font-bold"
        >
          {r.yes}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAnswer(false)}
          className="min-h-[54px] flex-1 rounded-[18px] border-2 border-line bg-card text-base font-bold"
        >
          {r.no}
        </button>
      </div>
    </section>
  );
}
