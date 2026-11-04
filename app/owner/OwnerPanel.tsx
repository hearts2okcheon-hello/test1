"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmCard } from "@/components/ConfirmCard";
import { NoticeButtons } from "@/components/NoticeButtons";
import { Osori } from "@/components/Osori";
import { useToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import { SIGN_STYLES, formatClock, signTitle } from "@/lib/signs";
import { createClient } from "@/lib/supabase/client";
import { seoulClock, todayOpenAt } from "@/lib/time";
import type { NoticeKind, OwnerHome } from "@/lib/types";

type Home = Extract<OwnerHome, { state: "owner" }>;

export function OwnerPanel({ home }: { home: Home }) {
  const { store, notice, questions } = home;
  const router = useRouter();
  const { node, show } = useToast();
  const [busy, setBusy] = useState(false);
  const s = SIGN_STYLES[store.sign];

  // 평소 여는 시간이 지났는데 오늘 소식이 없으면 먼저 묻는다
  const openAt = todayOpenAt(store.regular_hours);
  const askOpen = !notice && questions.length === 0 && openAt !== null && seoulClock() >= openAt;

  async function answer(reportId: string, yes: boolean) {
    setBusy(true);
    try {
      const { error } = await createClient().rpc("answer_report", { p_report_id: reportId, p_yes: yes });
      if (error) throw error;
      show("확인해 주셔서 고마워요. 팻말을 바꿔 걸었어요!", "proud");
      router.refresh();
    } catch (e) {
      show(errorMessage(e), "think");
    } finally {
      setBusy(false);
    }
  }

  async function quick(kind: NoticeKind) {
    setBusy(true);
    try {
      const { error } = await createClient().rpc("post_notice", { p_store_id: store.store_id, p_kind: kind });
      if (error) throw error;
      show("마을방송 했어요!", "proud");
      router.refresh();
    } catch (e) {
      show(errorMessage(e), "think");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="flex items-center gap-2.5">
        <Osori mood="proud" size={70} />
        <div className="flex flex-1 flex-col">
          <span className="text-[13px] text-muted">사장님 화면</span>
          <h1 className="font-display text-2xl leading-tight font-normal">{store.name}</h1>
        </div>
      </header>

      <div className="flex items-center gap-2.5 rounded-[18px] px-3.5 py-2.5" style={{ background: s.bg }}>
        <Osori mood={s.mood} size={44} />
        <span className="flex-1 text-sm">지금 손님에게 보이는 팻말</span>
        <span className="font-display text-lg" style={{ color: s.fg }}>
          {signTitle(store.sign, store.at_time)}
        </span>
      </div>

      {questions.map((q) => (
        <ConfirmCard key={q.id} kind={q.kind} createdAt={q.created_at} agreeCount={q.agree_count} busy={busy} onAnswer={(yes) => answer(q.id, yes)} />
      ))}

      {askOpen && openAt && (
        <section className="flex flex-col gap-2.5 rounded-[22px] border-2 border-yellow-line bg-cream px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <Osori mood="curious" size={54} />
            <span className="flex-1 text-sm leading-normal">평소 여는 시간({formatClock(openAt)})이 지났는데 아직 오늘 소식이 없어요</span>
          </div>
          <span className="font-display text-[22px] leading-snug">사장님, 오늘 문 여셨나요?</span>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => quick("open")} className="min-h-[54px] flex-1 rounded-[18px] border-2 border-yellow-deep bg-yellow text-base font-bold">
              네, 열었어요
            </button>
            <button type="button" disabled={busy} onClick={() => quick("closed_today")} className="min-h-[54px] flex-1 rounded-[18px] border-2 border-line bg-card text-base font-bold">
              오늘 쉬어요
            </button>
          </div>
        </section>
      )}

      <NoticeButtons storeId={store.store_id} current={notice} />
      {node}
    </>
  );
}
