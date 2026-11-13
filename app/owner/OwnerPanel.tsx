"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppAlertCard } from "@/components/AppAlertCard";
import { NoticeButtons } from "@/components/NoticeButtons";
import { TimeAgo } from "@/components/TimeAgo";
import { useToast } from "@/components/Toast";
import { seoulToday } from "@/lib/calendar";
import { askDelete } from "@/lib/confirm";
import { errorMessage } from "@/lib/errors";
import { dayLine, lastPlanDay, specialDays } from "@/lib/plans";
import { SIGN_STYLES, formatRange, signChip, signTitle } from "@/lib/signs";
import { createClient } from "@/lib/supabase/client";
import { seoulClock, todayOpenAt } from "@/lib/time";
import type { DayPlan, NoticeKind, OwnerHome, StorePost, TempClosure } from "@/lib/types";

type Home = Extract<OwnerHome, { state: "owner" }>;

export function OwnerPanel({ home, posts, closures, plans }: { home: Home; posts: StorePost[]; closures: TempClosure[]; plans: DayPlan[] }) {
  const { store, notice, questions } = home;
  const router = useRouter();
  const { node, show } = useToast();
  const [busy, setBusy] = useState(false);
  const s = SIGN_STYLES[store.sign];
  const today = seoulToday();

  // 평소 여는 시간이 지났는데 오늘 소식이 없으면 먼저 묻는다
  const openAt = todayOpenAt(store.regular_hours);
  const askOpen = store.sign !== "temp_closed" && !notice && questions.length === 0 && openAt !== null && seoulClock() >= openAt;
  const unknown = store.sign === "none" || store.sign === "checking";
  const todayPlan = dayLine(today, store.regular_hours, closures, plans);
  const upcoming = specialDays(today, lastPlanDay(today), store.regular_hours, closures, plans).filter((d) => d.day !== today).slice(0, 3);

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
      <header className="flex items-center gap-2.5">
        <Link href="/owner" aria-label="내 정보로 돌아가기" className="flex size-[46px] shrink-0 items-center justify-center rounded-full border-2 border-line bg-card">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-base text-muted">내 가게</span>
          <h1 className="truncate font-display text-2xl leading-tight font-normal">{store.name}</h1>
        </div>
        <Link href={`/stores/${store.store_id}`} className="flex min-h-12 shrink-0 items-center rounded-2xl border-2 border-line bg-card px-3 text-base font-bold">
          손님 화면 보기
        </Link>
      </header>

      {/* 오늘의 가게 상태: 한눈에 보고 바로 고른다 */}
      <section aria-labelledby="status-title" className="flex flex-col gap-3 rounded-[22px] border-2 border-line bg-card px-4 py-4">
        <div className="flex items-center gap-2">
          <h2 id="status-title" className="flex-1 font-display text-[23px] font-normal">오늘의 가게 상태</h2>
          <span
            className="shrink-0 rounded-full px-3 py-1 text-base font-bold"
            style={unknown ? { background: SIGN_STYLES.late_open.bg, color: SIGN_STYLES.late_open.fg } : { background: s.bg, color: s.fg }}
          >
            {unknown ? "상태 미확인" : signChip(store.sign, store.at_time)}
          </span>
        </div>
        {askOpen && <p className="text-lg leading-snug text-muted">평소 영업시간이 지났어요. 오늘 영업하시나요?</p>}
        <div role="group" aria-label="오늘 영업 상태 고르기" className="grid grid-cols-2 gap-1.5 rounded-[20px] bg-[#EFE9DF] p-1.5">
          <StatusButton kind="open" label="영업 중" on={store.sign === "open"} busy={busy} onClick={() => quick("open")} />
          <StatusButton kind="closed_today" label="오늘 휴무" on={store.sign === "closed_today" || store.sign === "temp_closed"} busy={busy} onClick={() => quick("closed_today")} />
        </div>
        {!unknown && store.sign !== "open" && store.sign !== "closed_today" && (
          <p className="text-base text-muted">지금 손님에게 보이는 팻말: <b className="text-ink">{signTitle(store.sign, store.at_time)}</b></p>
        )}
        {todayPlan.tone === "plan" && <p className="text-base font-bold text-blue">오늘 일정: {todayPlan.text}</p>}
      </section>

      <AppAlertCard who="owner" />

      <nav aria-label="가게 관리" className="flex flex-col gap-2">
        <MenuLink href="/owner/news" icon="pen" title="소식·공지 올리기" desc="오늘 들어온 소식에 바로 떠요" />
        <MenuLink href="/owner/calendar" icon="calendar" title="캘린더에 일정 넣기" desc="날짜별 휴무·늦게 열기·외출" />
        <MenuLink href="/owner/closure" icon="moon" title="임시휴무 알리기" desc="여러 날을 한 번에 쉴 때 골라요" />
        <MenuLink href="/owner/edit" icon="gear" title="가게 정보 고치기" desc="메뉴·사진·영업시간·위치" />
      </nav>

      {upcoming.length > 0 && (
        <section className="flex flex-col gap-1.5 rounded-[20px] border-2 border-line bg-card px-3.5 py-3">
          <h2 className="font-display text-[20px] font-normal">다가오는 일정</h2>
          {upcoming.map((d) => (
            <p key={d.day} className={`text-lg font-bold ${d.tone === "closed" ? "text-[#A4423F]" : "text-blue"}`}>
              {d.label} {d.text}
            </p>
          ))}
        </section>
      )}

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

/** 영업 중은 초록 동그라미, 오늘 휴무는 빨간 동그라미 */
function StatusButton({ kind, label, on, busy, onClick }: { kind: "open" | "closed_today"; label: string; on: boolean; busy: boolean; onClick: () => void }) {
  const s = SIGN_STYLES[kind];
  return (
    <button
      type="button"
      disabled={busy}
      aria-pressed={on}
      onClick={onClick}
      className="flex min-h-[68px] items-center justify-center gap-2 rounded-2xl border-2 font-display text-[22px] disabled:opacity-60"
      style={on ? { background: s.bg, borderColor: s.border, color: s.fg } : { background: "transparent", borderColor: "transparent" }}
    >
      <span aria-hidden className="size-4 shrink-0 rounded-full" style={{ background: s.dot }} />
      {label}
    </button>
  );
}

const ICONS = {
  pen: ["M4 20h4L19 9l-4-4L4 16z", "M13.5 6.5l4 4"],
  calendar: ["M5 6h14v14H5z", "M5 10h14", "M9 3.5v4", "M15 3.5v4"],
  moon: ["M19 14.5A8 8 0 0 1 9.5 5a7 7 0 1 0 9.5 9.5z"],
  gear: ["M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z", "M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"],
} as const;

function MenuLink({ href, icon, title, desc }: { href: string; icon: keyof typeof ICONS; title: string; desc: string }) {
  return (
    <Link href={href} className="flex min-h-[76px] items-center gap-3 rounded-[20px] border-2 border-line bg-card py-1.5 pr-3.5 pl-3">
      <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-full bg-yellow-soft text-ink">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          {ICONS[icon].map((d) => <path key={d} d={d} />)}
        </svg>
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-display text-xl leading-snug">{title}</span>
        <span className="text-base text-muted">{desc}</span>
      </span>
      <span aria-hidden className="text-2xl text-muted">›</span>
    </Link>
  );
}
