"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { askDelete } from "@/lib/confirm";
import { errorMessage } from "@/lib/errors";
import { createClient, ensureSession } from "@/lib/supabase/client";
import type { StoreComment, StorePost } from "@/lib/types";
import { Osori } from "./Osori";
import { SourceLine } from "./SourceLine";
import { TimeAgo } from "./TimeAgo";
import { useToast } from "./Toast";

const COMMENT_MAX = 200;

/** 2. 실시간 사장님 소식 & 공지 + 3. 소개글 & 주민 댓글 */
export function StoreSocial({
  storeId, intro, posts, comments, commentCount, canManage,
}: {
  storeId: string; intro: string | null; posts: StorePost[]; comments: StoreComment[]; commentCount: number; canManage: boolean;
}) {
  const router = useRouter();
  const { node, show } = useToast();
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");

  async function withSession(action: (s: ReturnType<typeof createClient>) => PromiseLike<{ error: unknown }>, done?: () => void) {
    setBusy(true);
    try {
      const supabase = createClient();
      await ensureSession(supabase);
      const { error } = await action(supabase);
      if (error) throw error;
      done?.();
      router.refresh();
    } catch (e) {
      show(errorMessage(e), "think");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section aria-labelledby="posts-title" className="flex flex-col gap-2.5">
        <h2 id="posts-title" className="font-display text-[21px] font-normal">실시간 사장님 소식 & 공지</h2>
        {posts.length === 0 ? (
          <div className="flex items-center gap-2.5 rounded-[18px] border-2 border-dashed border-line px-3.5 py-2.5 text-sm text-muted">
            <Osori mood="think" size={40} />
            아직 올라온 소식이 없어요
          </div>
        ) : (
          posts.map((p) => (
            <article key={p.id} className="flex flex-col gap-2.5 rounded-[20px] border-2 border-line bg-card px-3.5 py-3">
              {p.kind === "notice" && <span className="self-start rounded-[10px] bg-yellow px-2.5 py-0.5 font-display text-sm">공지</span>}
              <div className="flex gap-3">
                <p className="min-w-0 flex-1 text-[17px] leading-normal font-bold whitespace-pre-wrap">{p.body}</p>
                {p.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" loading="lazy" className="size-[104px] shrink-0 rounded-2xl object-cover" />
                )}
              </div>
              <span className="text-[13px] text-muted">
                <SourceLine source={p.source} at={p.created_at} />
                {p.updated_at ? " · 수정됨" : ""}
              </span>
              <div className="flex items-center gap-4 border-t-2 border-line pt-2">
                <button
                  type="button"
                  aria-pressed={p.liked_by_me}
                  disabled={busy}
                  onClick={() => withSession((s) => s.rpc("toggle_post_like", { p_post_id: p.id, p_on: !p.liked_by_me }))}
                  className="flex min-h-11 items-center gap-1.5 text-base font-bold"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden fill={p.liked_by_me ? "#D9706F" : "none"} stroke={p.liked_by_me ? "#D9706F" : "currentColor"} strokeWidth="2.2" strokeLinejoin="round">
                    <path d="M12 20s-7.5-4.6-9.3-9.2C1.5 7.5 3.6 4.5 6.8 4.5c2.2 0 3.9 1.2 5.2 3 1.3-1.8 3-3 5.2-3 3.2 0 5.3 3 4.1 6.3C19.5 15.4 12 20 12 20z" />
                  </svg>
                  공감 {p.like_count}
                </button>
                <a href="#comments" className="flex min-h-11 items-center gap-1.5 text-base font-bold">
                  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
                    <path d="M4 5.5h16v11H10l-4.5 3.5V16.5H4z" />
                  </svg>
                  주민 댓글 {commentCount}
                </a>
              </div>
            </article>
          ))
        )}
      </section>

      <section id="comments" aria-labelledby="intro-title" className="flex scroll-mt-4 flex-col gap-2.5 rounded-[22px] border-2 border-line bg-card px-3.5 py-3.5">
        <h2 id="intro-title" className="font-display text-[21px] font-normal">소개글 & 주민 소통 공간</h2>
        <p className="text-base leading-relaxed whitespace-pre-wrap">{intro ?? "아직 소개글이 없어요."}</p>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            withSession((s) => s.rpc("post_store_comment", { p_store_id: storeId, p_body: text.trim() }), () => setText(""));
          }}
        >
          <label className="sr-only" htmlFor="comment-input">주민 댓글</label>
          <input
            id="comment-input"
            value={text}
            maxLength={COMMENT_MAX}
            onChange={(e) => setText(e.target.value)}
            placeholder="따뜻한 한마디를 남겨 주세요"
            className="min-h-12 min-w-0 flex-1 rounded-2xl border-2 border-line bg-white px-3 text-base"
          />
          <button type="submit" disabled={busy || !text.trim()} className="min-h-12 shrink-0 rounded-2xl border-2 border-yellow-deep bg-yellow px-4 font-bold disabled:opacity-50">
            남기기
          </button>
        </form>

        {comments.length === 0 ? (
          <p className="text-sm text-muted">첫 댓글을 남겨 보세요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {comments.map((c) => (
              <li key={c.id} className="flex items-start gap-2 rounded-2xl bg-cream px-3 py-2">
                <span className="min-w-0 flex-1 text-[15px] leading-normal whitespace-pre-wrap">{c.body}</span>
                <span className="shrink-0 text-xs text-muted">
                  <TimeAgo iso={c.created_at} />
                </span>
                {(c.is_mine || canManage) && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      if (await askDelete({ detail: "이 댓글이 사라져요." })) withSession((s) => s.rpc("delete_store_comment", { p_comment_id: c.id }));
                    }}
                    className="shrink-0 text-xs font-bold text-[#A4423F] underline"
                  >
                    지우기
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      {node}
    </>
  );
}
