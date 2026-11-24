"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CommentIcon, LikeButton } from "@/components/StoreSocial";
import { SignChip } from "@/components/SignChip";
import { TimeAgo } from "@/components/TimeAgo";
import { useToast } from "@/components/Toast";
import { askDelete } from "@/lib/confirm";
import { errorMessage } from "@/lib/errors";
import type { NewsItem } from "@/lib/okinews";
import { PLAZA_TABS, type PlazaTab } from "@/lib/plaza";
import { feedLine, REPORT_STYLES } from "@/lib/signs";
import { createClient, ensureSession } from "@/lib/supabase/client";
import type { FeedItem, NoticeKind, ReportKind } from "@/lib/types";
import { NewsCards, type NewsStat } from "./NewsCards";

export type TodayReport = { report_id: string; store_id: string; store_name: string; kind: ReportKind; status: "pending" | "confirmed"; resolved_source: "owner" | "okcheon" | null; created_at: string };
export type CommunityComment = { id: string; anon_name: string; body: string; created_at: string; is_mine: boolean };
export type CommunityPost = { id: string; anon_name: string; body: string; created_at: string; is_mine: boolean; comment_count: number; comments: CommunityComment[]; like_count: number; liked_by_me: boolean };

type Kind = Exclude<PlazaTab, "okinews">;

// 다른 화면에 다녀와도 보던 줄을 기억한다 (앱을 새로 열면 맨 앞 옥천신문)
let remembered: PlazaTab = "okinews";

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

/**
 * 소통광장 "우리동네 소식" (ADR-018, ADR-023). 줄에서 옥천신문(최근 기사) · 동네 이야기 · 사장님 소식 · 이웃 제보를 고른다.
 * initialTab 은 주소의 ?tab= 값 (글을 올린 뒤 그 줄로 돌아올 때 쓴다)
 */
export function NewsList({
  feed,
  reports,
  posts,
  isAdmin,
  news,
  stats,
  newsLoaded,
  newsDays,
  initialTab,
}: {
  feed: FeedItem[];
  reports: TodayReport[];
  posts: CommunityPost[];
  isAdmin: boolean;
  news: NewsItem[];
  stats: NewsStat[];
  newsLoaded: boolean;
  newsDays: number;
  initialTab: PlazaTab | null;
}) {
  const router = useRouter();
  const { node, show } = useToast();
  const [filter, setFilter] = useState<PlazaTab>(() => {
    if (initialTab) remembered = initialTab;
    return remembered;
  });
  const row = useRef<HTMLDivElement>(null);
  const { likeOf, toggleLike } = useCommunityLikes(posts, show);

  // 기억해 둔 줄이 화면 밖에 있으면 보이게 한다
  useLayoutEffect(() => {
    const on = row.current?.querySelector<HTMLElement>("[aria-pressed=true]");
    if (row.current && on) row.current.scrollLeft = on.offsetLeft - (row.current.clientWidth - on.offsetWidth) / 2;
  }, []);

  function pick(next: PlazaTab) {
    remembered = next;
    setFilter(next);
    // 고른 줄을 주소에도 남긴다. 기사를 보고 돌아오거나 화면이 새로 열려도 같은 줄이 열린다
    window.history.replaceState(null, "", next === "okinews" ? "/news" : `/news?tab=${next}`);
  }

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

  const shown = rows.filter((r) => r.kind === filter);

  return (
    <>
      <div ref={row} role="group" aria-label="우리동네 소식 종류" className="ok-scroll-x -mx-5 flex gap-1.5 overflow-x-auto px-5 py-1.5">
        {PLAZA_TABS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => pick(f.id)}
            className={`min-h-12 shrink-0 touch-manipulation rounded-full border-2 px-4 font-display text-[15px] whitespace-nowrap ${filter === f.id ? "border-sage-deep bg-sage text-white" : "border-line bg-card"}`}
          >
            {f.name}
          </button>
        ))}
      </div>

      {filter === "okinews" ? (
        <NewsCards news={news} stats={stats} loaded={newsLoaded} days={newsDays} />
      ) : (
        <>
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
              if (r.post) {
                const post = r.post;
                const like = likeOf(post);
                const href = `/news/${post.id}`;
                return (
                  <article key={r.key} className={CARD}>
                    {/* 글을 누르면 전체 화면에서 댓글과 함께 본다 */}
                    <Link href={href} className="flex flex-col gap-2.5">{head}</Link>
                    <div className="flex items-center gap-5 border-t-2 border-line pt-1">
                      <LikeButton on={like.on} count={like.count} onClick={() => toggleLike(post)} />
                      <Link href={href} className="flex min-h-11 items-center gap-1.5 text-[15px] font-bold">
                        <CommentIcon />
                        댓글 {post.comment_count}
                      </Link>
                      {(post.is_mine || isAdmin) && (
                        <button type="button" onClick={() => removePost(post.id)} className="ml-auto min-h-11 px-2 text-sm font-bold text-danger">
                          지우기
                        </button>
                      )}
                    </div>
                  </article>
                );
              }
              return (
                <Link key={r.key} href={`/stores/${r.storeId}`} className={`${CARD} ${r.dim ? "opacity-60" : ""}`}>{head}</Link>
              );
            })}
          </div>
          {shown.length === 0 && <p className="rounded-[22px] border-2 border-dashed border-line px-4 py-3 text-sm text-muted">아직 올라온 글이 없어요.</p>}
        </>
      )}
      {node}
    </>
  );
}

/** 동네 이야기 공감: 누르는 즉시 화면에 반영하고, 저장은 뒤에서 차례로 한다 */
export function useCommunityLikes(posts: CommunityPost[], show: (msg: string, mood?: "think") => void) {
  const [likes, setLikes] = useState<Record<string, { on: boolean; count: number }>>({});
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => setLikes({}), [posts]);

  const likeOf = (p: CommunityPost) => likes[p.id] ?? { on: p.liked_by_me, count: p.like_count };

  function toggleLike(p: CommunityPost) {
    const cur = likeOf(p);
    const next = { on: !cur.on, count: Math.max(0, cur.count + (cur.on ? -1 : 1)) };
    setLikes((m) => ({ ...m, [p.id]: next }));
    queue.current = queue.current.then(async () => {
      try {
        const supabase = createClient();
        await ensureSession(supabase);
        const { error } = await supabase.rpc("toggle_community_like", { p_post_id: p.id, p_on: next.on });
        if (error) throw error;
      } catch (e) {
        setLikes((m) => ({ ...m, [p.id]: cur }));
        show(errorMessage(e), "think");
      }
    });
  }
  return { likeOf, toggleLike };
}
