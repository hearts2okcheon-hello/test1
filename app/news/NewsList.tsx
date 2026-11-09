"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SignChip } from "@/components/SignChip";
import { TimeAgo } from "@/components/TimeAgo";
import { useToast } from "@/components/Toast";
import { askDelete } from "@/lib/confirm";
import { errorMessage } from "@/lib/errors";
import { feedLine, REPORT_STYLES } from "@/lib/signs";
import { createClient } from "@/lib/supabase/client";
import type { FeedItem, NoticeKind, ReportKind } from "@/lib/types";

export type TodayReport = { report_id: string; store_id: string; store_name: string; kind: ReportKind; status: "pending" | "confirmed"; resolved_source: "owner" | "okcheon" | null; created_at: string };
export type CommunityPost = { id: string; anon_name: string; body: string; created_at: string; is_mine: boolean };

type Filter = "all" | "community" | "owner" | "neighbor";
const FILTERS: { id: Filter; name: string }[] = [
  { id: "all", name: "전체" },
  { id: "community", name: "동네 이야기" },
  { id: "owner", name: "사장님 소식" },
  { id: "neighbor", name: "이웃 제보" },
];

const SRC_OWNER = "bg-[#FFF1C9] text-[#7A4E00]";
const SRC_NEIGHBOR = "bg-[#DCEEF7] text-[#1F5A7A]";
const SRC_COMMUNITY = "bg-sage-soft text-sage-deep";
const CARD = "ok-sticker flex gap-2.5 rounded-[22px] border-2 border-line bg-card px-[18px] py-4";

function reportSource(r: TodayReport) {
  if (r.status === "pending") return "이웃 제보 · 확인 중";
  return r.resolved_source === "okcheon" ? "이웃 제보 · 옥천신문 확인" : "이웃 제보 · 사장님 확인";
}

function feedChip(f: FeedItem) {
  if (f.item_type === "closure") return <SignChip sign="temp_closed" />;
  if (f.item_type === "post") return <span className="ok-sign border-yellow-line bg-yellow-soft text-[#7E5810]">{f.kind === "notice" ? "공지" : "소식"}</span>;
  return f.is_current ? <SignChip sign={f.kind as NoticeKind} atTime={f.at_time} /> : <span className="text-xs font-bold text-muted">지난 소식</span>;
}

type Row = { key: string; kind: Exclude<Filter, "all">; at: string; storeId: string | null; title: string; chip: React.ReactNode; body: string; source: string; srcClass: string; image: string | null; dim: boolean; deleteId: string | null };

export function NewsList({ feed, reports, posts, isAdmin }: { feed: FeedItem[]; reports: TodayReport[]; posts: CommunityPost[]; isAdmin: boolean }) {
  const router = useRouter();
  const { node, show } = useToast();
  const [filter, setFilter] = useState<Filter>("all");

  async function remove(id: string) {
    if (!(await askDelete({ detail: "이 글이 사라져요." }))) return;
    const { error } = await createClient().rpc("delete_community_post", { p_post_id: id });
    if (error) return show(errorMessage(error), "think");
    show("지웠어요.", "proud");
    router.refresh();
  }

  const rows: Row[] = [
    ...posts.map((p): Row => ({ key: `community-${p.id}`, kind: "community", at: p.created_at, storeId: null, title: p.anon_name, chip: null, body: p.body, source: "동네 이야기", srcClass: SRC_COMMUNITY, image: null, dim: false, deleteId: p.is_mine || isAdmin ? p.id : null })),
    ...feed.map((f): Row => ({ key: `${f.item_type}-${f.item_id}`, kind: "owner", at: f.created_at, storeId: f.store_id, title: f.store_name, chip: feedChip(f), body: feedLine(f), source: f.source === "owner" ? "사장님이 올림" : "옥천신문 확인", srcClass: SRC_OWNER, image: f.image_url, dim: !f.is_current, deleteId: null })),
    // 확인 전 제보는 확정처럼 보이면 안 된다
    ...reports.map((r): Row => ({ key: `report-${r.report_id}`, kind: "neighbor", at: r.created_at, storeId: r.store_id, title: r.store_name, chip: r.status === "pending" ? <SignChip sign="checking" /> : null, body: REPORT_STYLES[r.kind].label, source: reportSource(r), srcClass: SRC_NEIGHBOR, image: null, dim: false, deleteId: null })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const shown = rows.filter((r) => filter === "all" || r.kind === filter);

  return (
    <>
      <div className="ok-scroll-x -mx-5 flex gap-2 overflow-x-auto px-5 pt-0.5 pb-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`min-h-11 shrink-0 rounded-full border-2 px-4 font-display text-[15px] ${filter === f.id ? "border-sage-deep bg-sage text-white" : "border-line bg-card"}`}
          >
            {f.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-3">
        {shown.map((r) => {
          const inner = (
            <>
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="font-display text-lg break-words">{r.title}</span>
                    {r.chip}
                  </span>
                  <span className="shrink-0 text-xs whitespace-nowrap text-muted"><TimeAgo iso={r.at} /></span>
                </span>
                <span className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{r.body}</span>
                <span className="flex items-center justify-between gap-2">
                  <span className={`rounded-full px-2.5 py-[3px] text-xs font-bold ${r.srcClass}`}>{r.source}</span>
                  {r.deleteId && (
                    <button type="button" onClick={() => remove(r.deleteId!)} className="min-h-11 px-2 text-sm font-bold text-[#A4423F]">
                      지우기
                    </button>
                  )}
                </span>
              </span>
              {r.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.image} alt="" loading="lazy" className="size-[72px] shrink-0 self-center rounded-xl object-cover" />
              )}
            </>
          );
          return r.storeId ? (
            <Link key={r.key} href={`/stores/${r.storeId}`} className={`${CARD} ${r.dim ? "opacity-60" : ""}`}>{inner}</Link>
          ) : (
            <article key={r.key} className={CARD}>{inner}</article>
          );
        })}
      </div>
      {shown.length === 0 && <p className="rounded-[22px] border-2 border-dashed border-line px-4 py-3 text-sm text-muted">아직 올라온 글이 없어요.</p>}
      {node}
    </>
  );
}
