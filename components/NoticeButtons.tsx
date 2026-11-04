"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorMessage } from "@/lib/errors";
import { MEMO_CHIPS, MEMO_MAX, NOTICE_KINDS, SIGN_STYLES, TIMED_KINDS, formatClock } from "@/lib/signs";
import { createClient } from "@/lib/supabase/client";
import { seoulClock } from "@/lib/time";
import type { NoticeKind, OwnerNotice } from "@/lib/types";
import { Osori } from "./Osori";
import { useToast } from "./Toast";

/** 다음 정각/30분부터 n개 */
function upcomingTimes(n = 8): string[] {
  const [h, m] = seoulClock().split(":").map(Number);
  let mins = Math.ceil((h * 60 + m + 1) / 30) * 30;
  const out: string[] = [];
  while (out.length < n && mins <= 23 * 60 + 30) {
    out.push(`${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`);
    mins += 30;
  }
  return out;
}

/**
 * 원탭 공지 (MVP ①). 누르면 바로 방송, 5분 안에 되돌리기.
 * 사장님 화면과 옥천신문 대리 등록이 같이 쓴다.
 */
export function NoticeButtons({ storeId, current, proxy = false }: { storeId: string; current: OwnerNotice | null; proxy?: boolean }) {
  const router = useRouter();
  const { node, show } = useToast();
  const [busy, setBusy] = useState(false);
  const [askTime, setAskTime] = useState<NoticeKind | null>(null);
  const [memo, setMemo] = useState("");

  async function post(kind: NoticeKind, atTime: string | null = null) {
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: id, error } = await supabase.rpc("post_notice", { p_store_id: storeId, p_kind: kind, p_at_time: atTime });
      if (error) throw error;
      setAskTime(TIMED_KINDS.includes(kind) && !atTime ? kind : null);
      show(
        proxy ? "대신 방송했어요. 출처는 옥천신문 확인으로 보여요." : "마을방송 했어요! 가게 팻말도 바꿔 걸었어요.",
        "proud",
        { label: "되돌리기", onClick: () => undo(id as string) },
        6000,
      );
      router.refresh();
    } catch (e) {
      show(errorMessage(e), "think");
    } finally {
      setBusy(false);
    }
  }

  async function undo(id: string) {
    const { error } = await createClient().rpc("undo_notice", { p_notice_id: id });
    if (error) show(errorMessage(error), "think");
    else {
      setAskTime(null);
      show("되돌렸어요.", "smile");
    }
    router.refresh();
  }

  async function attachMemo(text: string) {
    if (!current) return;
    const value = text.trim().slice(0, MEMO_MAX);
    if (!value) return;
    setBusy(true);
    try {
      const { error } = await createClient().rpc("set_notice_memo", { p_notice_id: current.id, p_memo: value });
      if (error) throw error;
      setMemo("");
      show("쪽지를 가게 팻말에 붙였어요!", "together");
      router.refresh();
    } catch (e) {
      show(errorMessage(e), "think");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-[22px] font-normal">오늘 소식, 누르면 바로 방송돼요</h2>
          <span className="text-[13px] text-muted">글을 쓰지 않아도 돼요. 하나만 고르세요.</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {NOTICE_KINDS.map((k) => {
            const s = SIGN_STYLES[k];
            const on = current?.kind === k;
            return (
              <button
                key={k}
                type="button"
                disabled={busy}
                aria-pressed={on}
                onClick={() => post(k)}
                className="flex min-h-[92px] flex-col items-center justify-center gap-0.5 rounded-[20px] border-2 px-2 pt-1.5 pb-2"
                style={{ background: on ? s.bg : "#FFFDF8", borderColor: on ? s.fg : "#E8DCC8" }}
              >
                <Osori mood={s.mood} size={48} />
                <span className="text-base font-bold">{s.button}</span>
              </button>
            );
          })}
        </div>
      </section>

      {askTime && (
        <section className="flex flex-col gap-2 rounded-[22px] border-2 border-yellow-line bg-cream px-4 py-3.5">
          <span className="font-display text-lg">
            {askTime === "late_open" ? "몇 시에 여세요?" : "몇 시에 닫으세요?"}{" "}
            <span className="font-sans text-[13px] text-muted">(몰라도 괜찮아요)</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {upcomingTimes().map((t) => (
              <button
                key={t}
                type="button"
                disabled={busy}
                onClick={() => post(askTime, t)}
                className="min-h-11 rounded-[22px] border-2 border-line bg-card px-3.5 text-sm font-bold"
              >
                {formatClock(t)}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-[19px] font-normal">
          쪽지 한 줄 더하기 <span className="font-sans text-[13px] text-muted">(선택)</span>
        </h2>
        {current ? (
          <>
            <div className="flex flex-wrap gap-2">
              {MEMO_CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={busy}
                  onClick={() => attachMemo(c)}
                  className="min-h-11 rounded-[22px] border-2 border-line bg-card px-3.5 text-sm font-bold"
                >
                  {c}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                attachMemo(memo);
              }}
            >
              <label className="sr-only" htmlFor={`memo-${storeId}`}>
                쪽지
              </label>
              <input
                id={`memo-${storeId}`}
                value={memo}
                maxLength={MEMO_MAX}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="직접 쓰기 (40자까지)"
                className="min-h-12 min-w-0 flex-1 rounded-2xl border-2 border-line bg-white px-3 text-base"
              />
              <button type="submit" disabled={busy || !memo.trim()} className="min-h-12 shrink-0 rounded-2xl border-2 border-yellow-deep bg-yellow px-4 font-bold disabled:opacity-50">
                붙이기
              </button>
            </form>
            {current.memo && <p className="text-sm text-muted">지금 붙은 쪽지: &ldquo;{current.memo}&rdquo;</p>}
          </>
        ) : (
          <p className="text-sm text-muted">먼저 위에서 오늘 소식을 하나 골라 주세요.</p>
        )}
      </section>
      {node}
    </>
  );
}
