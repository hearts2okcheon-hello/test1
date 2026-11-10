"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NoticeButtons } from "@/components/NoticeButtons";
import { Osori } from "@/components/Osori";
import { ReportAlert } from "@/components/ReportAlert";
import { TimeAgo } from "@/components/TimeAgo";
import { useToast } from "@/components/Toast";
import { askDelete } from "@/lib/confirm";
import { errorMessage } from "@/lib/errors";
import { SIGN_STYLES, formatClock, formatRange, signTitle } from "@/lib/signs";
import { createClient } from "@/lib/supabase/client";
import { seoulClock, todayOpenAt } from "@/lib/time";
import type { NoticeKind, OwnerHome, StorePost, TempClosure } from "@/lib/types";

type Home = Extract<OwnerHome, { state: "owner" }>;

export function OwnerPanel({ home, posts, closures }: { home: Home; posts: StorePost[]; closures: TempClosure[] }) {
  const { store, notice, questions } = home;
  const router = useRouter();
  const { node, show } = useToast();
  const [busy, setBusy] = useState(false);
  const s = SIGN_STYLES[store.sign];

  // 평소 여는 시간이 지났는데 오늘 소식이 없으면 먼저 묻는다
  const openAt = todayOpenAt(store.regular_hours);
  const askOpen = store.sign !== "temp_closed" && !notice && questions.length === 0 && openAt !== null && seoulClock() >= openAt;

  async function run(action: () => PromiseLike<{ error: unknown }>, done: string) {
    setBusy(true);
    try {
      const { error } = await action();
      if (error) throw error;
      show(done, "proud");
      router.refresh();
      return true;
    } catch (e) {
      show(errorMessage(e), "think");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const reply = (open: boolean, memo: string) =>
    run(() => createClient().rpc("reply_reports", { p_store_id: store.store_id, p_open: open, p_memo: memo || null }), "이웃에게 알렸어요. 팻말을 바꿔 걸었어요!");
  const quick = (kind: NoticeKind) =>
    run(() => createClient().rpc("post_notice", { p_store_id: store.store_id, p_kind: kind }), "마을방송 했어요!");

  function cancelClosure(c: TempClosure) {
    if (!window.confirm(`${formatRange(c.start_date, c.end_date)} 임시휴무를 취소할까요?`)) return;
    run(() => createClient().rpc("cancel_temp_closure", { p_closure_id: c.id }), "임시휴무를 취소했어요.");
  }

  async function deletePost(p: StorePost) {
    if (!(await askDelete({ detail: "이 소식이 사라져요." }))) return;
    run(() => createClient().rpc("delete_store_post", { p_post_id: p.id }), "소식을 지웠어요.");
  }

  return (
    <>
      <ReportAlert questions={questions} busy={busy} onReply={reply} />

      <header className="flex items-center gap-2.5">
        <Osori mood="proud" size={70} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-base text-muted">사장님 화면</span>
          <h1 className="truncate font-display text-2xl leading-tight font-normal">{store.name}</h1>
        </div>
        <Link href={`/stores/${store.store_id}`} className="flex min-h-12 shrink-0 items-center rounded-2xl border-2 border-line bg-card px-3 text-base font-bold">
          내 가게 보기
        </Link>
      </header>

      <div className="flex items-center gap-2.5 rounded-[18px] px-3.5 py-2.5" style={{ background: s.bg }}>
        <Osori mood={s.mood} size={44} />
        <span className="flex-1 text-base">지금 손님에게 보이는 팻말</span>
        <span className="font-display text-lg" style={{ color: s.fg }}>
          {signTitle(store.sign, store.at_time)}
        </span>
      </div>

      {askOpen && openAt && (
        <section className="flex flex-col gap-2.5 rounded-[22px] border-2 border-yellow-line bg-cream px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <Osori mood="curious" size={54} />
            <span className="flex-1 text-base leading-normal">평소 여는 시간({formatClock(openAt)})이 지났는데 아직 오늘 소식이 없어요</span>
          </div>
          <span className="font-display text-[22px] leading-snug">사장님, 오늘 문 여셨나요?</span>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => quick("open")} className="min-h-16 flex-1 rounded-[18px] border-2 border-yellow-deep bg-yellow text-lg font-bold">
              네, 열었어요
            </button>
            <button type="button" disabled={busy} onClick={() => quick("closed_today")} className="min-h-16 flex-1 rounded-[18px] border-2 border-line bg-card text-lg font-bold">
              오늘 쉬어요
            </button>
          </div>
        </section>
      )}

      <nav aria-label="가게 관리" className="flex flex-col gap-2">
        <MenuLink href="/owner/news" mood="talk" title="소식·공지 올리기" desc="오늘 들어온 소식에 바로 떠요" />
        <MenuLink href="/owner/closure" mood="rest" title="임시휴무 알리기" desc="달력에서 언제부터 언제까지 골라요" />
        <MenuLink href="/owner/edit" mood="work" title="가게 정보 고치기" desc="메뉴·사진·영업시간·위치" />
      </nav>

      {closures.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-[22px] font-normal">잡혀 있는 임시휴무</h2>
          {closures.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-[20px] border-2 border-line bg-card px-3.5 py-3">
              <span aria-hidden className="size-3.5 shrink-0 rounded-full" style={{ background: "#EF4444" }} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-lg font-bold">{formatRange(c.start_date, c.end_date)}</span>
                {c.reason && <span className="text-base text-muted">{c.reason}</span>}
              </span>
              <button type="button" disabled={busy} onClick={() => cancelClosure(c)} className="min-h-12 shrink-0 rounded-2xl border-2 border-line bg-white px-3.5 text-base font-bold text-[#A4423F]">
                취소
              </button>
            </div>
          ))}
        </section>
      )}

      <NoticeButtons storeId={store.store_id} current={notice} />

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-[22px] font-normal">내가 올린 소식</h2>
        {posts.length === 0 ? (
          <p className="rounded-[18px] border-2 border-dashed border-line px-3.5 py-3 text-base text-muted">아직 올린 소식이 없어요.</p>
        ) : (
          posts.map((p) => (
            <article key={p.id} className="flex flex-col gap-2 rounded-[20px] border-2 border-line bg-card px-3.5 py-3">
              <div className="flex gap-2.5">
                <p className="min-w-0 flex-1 text-lg leading-normal whitespace-pre-wrap">{p.body}</p>
                {p.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" loading="lazy" className="size-20 shrink-0 rounded-xl object-cover" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="flex-1 text-sm text-muted">
                  <TimeAgo iso={p.created_at} />
                  {p.updated_at ? " · 수정됨" : ""} · 공감 {p.like_count}
                </span>
                <Link href={`/owner/news?id=${p.id}`} className="flex min-h-12 items-center rounded-2xl border-2 border-line bg-white px-3.5 text-base font-bold">
                  고치기
                </Link>
                <button type="button" disabled={busy} onClick={() => deletePost(p)} className="min-h-12 rounded-2xl border-2 border-line bg-white px-3.5 text-base font-bold text-[#A4423F]">
                  지우기
                </button>
              </div>
            </article>
          ))
        )}
      </section>
      {node}
    </>
  );
}

function MenuLink({ href, mood, title, desc }: { href: string; mood: "talk" | "rest" | "work"; title: string; desc: string }) {
  return (
    <Link href={href} className="flex min-h-[76px] items-center gap-2.5 rounded-[20px] border-2 border-line bg-card py-1.5 pr-3.5 pl-2">
      <Osori mood={mood} size={58} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-display text-xl leading-snug">{title}</span>
        <span className="text-base text-muted">{desc}</span>
      </span>
      <span aria-hidden className="text-2xl text-muted">›</span>
    </Link>
  );
}
