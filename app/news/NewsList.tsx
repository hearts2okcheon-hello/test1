"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SignChip } from "@/components/SignChip";
import { TimeAgo } from "@/components/TimeAgo";
import { useToast } from "@/components/Toast";
import { askDelete } from "@/lib/confirm";
import { errorMessage } from "@/lib/errors";
import { feedLine, REPORT_STYLES, type Mood } from "@/lib/signs";
import { createClient } from "@/lib/supabase/client";
import type { FeedItem, NoticeKind, ReportKind } from "@/lib/types";

export type TodayReport = { report_id: string; store_id: string; store_name: string; kind: ReportKind; status: "pending" | "confirmed"; resolved_source: "owner" | "okcheon" | null; created_at: string };
export type CommunityComment = { id: string; anon_name: string; body: string; created_at: string; is_mine: boolean };
export type CommunityPost = { id: string; anon_name: string; body: string; created_at: string; is_mine: boolean; comment_count: number; comments: CommunityComment[] };

type Kind = "community" | "owner" | "neighbor";
type Filter = "all" | Kind;
const FILTERS: { id: Filter; name: string }[] = [
  { id: "all", name: "전체" },
  { id: "community", name: "동네 이야기" },
  { id: "owner", name: "사장님 소식" },
  { id: "neighbor", name: "이웃 제보" },
];

/** 글마다 붙는 카테고리 표시 */
const KIND_TAG: Record<Kind, { name: string; cls: string }> = {
  community: { name: "동네 이야기", cls: "bg-sage-soft text-sage-deep" },
  owner: { name: "사장님 소식", cls: "bg-[#FFF1C9] text-[#7A4E00]" },
  neighbor: { name: "이웃 제보", cls: "bg-[#DCEEF7] text-[#1F5A7A]" },
};
const CARD = "ok-sticker flex flex-col gap-2.5 rounded-[22px] border-2 border-line bg-card px-[18px] py-4";

function reportSource(r: TodayReport) {
  if (r.status === "pending") return "확인 중";
  return r.resolved_source === "okcheon" ? "옥천신문 확인" : "사장님 확인";
}

function feedChip(f: FeedItem) {
  if (f.item_type === "closure") return <SignChip sign="temp_closed" />;
  if (f.item_type === "post") return <span className="ok-sign border-yellow-line bg-yellow-soft text-[#7E5810]">{f.kind === "notice" ? "공지" : "소식"}</span>;
  return f.is_current ? <SignChip sign={f.kind as NoticeKind} atTime={f.at_time} /> : <span className="text-xs font-bold text-muted">지난 소식</span>;
}

type Row = { key: string; kind: Kind; at: string; storeId: string | null; title: string; chip: React.ReactNode; body: string; source: string | null; image: string | null; dim: boolean; post: CommunityPost | null };

export function NewsList({ feed, reports, posts, isAdmin, signedIn }: { feed: FeedItem[]; reports: TodayReport[]; posts: CommunityPost[]; isAdmin: boolean; signedIn: boolean }) {
  const router = useRouter();
  const { node, show } = useToast();
  const [filter, setFilter] = useState<Filter>("all");

  async function removePost(id: string) {
    if (!(await askDelete({ detail: "이 글이 사라져요." }))) return;
    const { error } = await createClient().rpc("delete_community_post", { p_post_id: id });
    if (error) return show(errorMessage(error), "think");
    show("지웠어요.", "proud");
    router.refresh();
  }

  const rows: Row[] = [
    ...posts.map((p): Row => ({ key: `community-${p.id}`, kind: "community", at: p.created_at, storeId: null, title: p.anon_name, chip: null, body: p.body, source: null, image: null, dim: false, post: p })),
    ...feed.map((f): Row => ({ key: `${f.item_type}-${f.item_id}`, kind: "owner", at: f.created_at, storeId: f.store_id, title: f.store_name, chip: feedChip(f), body: feedLine(f), source: f.source === "owner" ? "사장님이 올림" : "옥천신문 확인", image: f.image_url, dim: !f.is_current, post: null })),
    // 확인 전 제보는 확정처럼 보이면 안 된다
    ...reports.map((r): Row => ({ key: `report-${r.report_id}`, kind: "neighbor", at: r.created_at, storeId: r.store_id, title: r.store_name, chip: r.status === "pending" ? <SignChip sign="checking" /> : null, body: REPORT_STYLES[r.kind].label, source: reportSource(r), image: null, dim: false, post: null })),
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
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] items-start gap-3">
        {shown.map((r) => {
          const tag = KIND_TAG[r.kind];
          const head = (
            <>
              <span className="flex w-full items-center gap-2">
                <span className={`shrink-0 rounded-full px-2.5 py-[3px] text-[12px] font-bold ${tag.cls}`}>{tag.name}</span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-muted">{r.title}</span>
                <span className="shrink-0 text-xs whitespace-nowrap text-muted"><TimeAgo iso={r.at} /></span>
              </span>
              <span className="flex gap-3">
                <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                  {r.chip}
                  <span className="text-[18px] leading-[1.55] break-words break-keep whitespace-pre-wrap">{r.body}</span>
                </span>
                {r.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.image} alt="" loading="lazy" className="size-[72px] shrink-0 self-center rounded-xl object-cover" />
                )}
              </span>
              {r.source && <span className="text-[12px] text-muted">{r.source}</span>}
            </>
          );
          return r.post ? (
            <article key={r.key} className={CARD}>
              {head}
              <CommentBox post={r.post} signedIn={signedIn} isAdmin={isAdmin} onDeletePost={r.post.is_mine || isAdmin ? () => removePost(r.post!.id) : null} show={show} />
            </article>
          ) : (
            <Link key={r.key} href={`/stores/${r.storeId}`} className={`${CARD} ${r.dim ? "opacity-60" : ""}`}>{head}</Link>
          );
        })}
      </div>
      {shown.length === 0 && <p className="rounded-[22px] border-2 border-dashed border-line px-4 py-3 text-sm text-muted">아직 올라온 글이 없어요.</p>}
      {node}
    </>
  );
}

/** 동네 이야기 댓글: 접어 두었다가 누르면 펼친다. 카카오 로그인한 사람만 쓰고, 화면에는 익명으로 보인다 */
function CommentBox({
  post, signedIn, isAdmin, onDeletePost, show,
}: {
  post: CommunityPost; signedIn: boolean; isAdmin: boolean; onDeletePost: (() => void) | null; show: (msg: string, mood?: Mood) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    const { error } = await createClient().rpc("post_community_comment", { p_post_id: post.id, p_body: text.trim() });
    setBusy(false);
    if (error) return show(errorMessage(error), "think");
    setText("");
    router.refresh();
  }

  async function removeComment(id: string) {
    if (!(await askDelete({ detail: "이 댓글이 사라져요." }))) return;
    const { error } = await createClient().rpc("delete_community_comment", { p_comment_id: id });
    if (error) return show(errorMessage(error), "think");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 border-t-2 border-line pt-1">
      <span className="flex items-center justify-between gap-2">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex min-h-11 items-center gap-1.5 text-[15px] font-bold">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
            <path d="M4 5.5h16v11H10l-4.5 3.5V16.5H4z" />
          </svg>
          댓글 {post.comment_count}
        </button>
        {onDeletePost && (
          <button type="button" onClick={onDeletePost} className="min-h-11 px-2 text-sm font-bold text-[#A4423F]">
            지우기
          </button>
        )}
      </span>
      {open && (
        <>
          {post.comments.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {post.comments.map((c) => (
                <li key={c.id} className="flex flex-col gap-0.5 rounded-2xl bg-cream px-3 py-2">
                  <span className="flex items-center gap-2 text-[13px]">
                    <b className={c.anon_name === "글쓴이" ? "text-sage-deep" : "text-muted"}>{c.anon_name}</b>
                    <span className="text-muted"><TimeAgo iso={c.created_at} /></span>
                    {(c.is_mine || isAdmin) && (
                      <button type="button" onClick={() => removeComment(c.id)} className="ml-auto min-h-8 px-1 text-xs font-bold text-[#A4423F] underline">
                        지우기
                      </button>
                    )}
                  </span>
                  <span className="text-[16px] leading-normal break-words whitespace-pre-wrap">{c.body}</span>
                </li>
              ))}
            </ul>
          )}
          {signedIn ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <label className="sr-only" htmlFor={`cc-${post.id}`}>댓글</label>
              <input id={`cc-${post.id}`} value={text} maxLength={200} onChange={(e) => setText(e.target.value)} placeholder="익명으로 댓글 달기" className="min-h-12 min-w-0 flex-1 rounded-2xl border-2 border-line bg-white px-3 text-base" />
              <button type="submit" disabled={busy || !text.trim()} className="min-h-12 shrink-0 rounded-2xl border-2 border-yellow-deep bg-yellow px-4 font-bold disabled:opacity-50">
                남기기
              </button>
            </form>
          ) : (
            <a href="/auth/kakao?next=/news" className="flex min-h-12 items-center justify-center rounded-2xl bg-[#FEE500] text-base font-bold text-black/85">
              카카오로 로그인하고 댓글 달기
            </a>
          )}
        </>
      )}
    </div>
  );
}
