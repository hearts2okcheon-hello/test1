"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { askDelete } from "@/lib/confirm";
import { errorMessage } from "@/lib/errors";
import { postParts } from "@/lib/signs";
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
  const { likeOf, toggleLike } = usePostLikes(posts, show);

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

  async function removeComment(id: string) {
    if (await askDelete({ detail: "이 댓글이 사라져요." })) withSession((s) => s.rpc("delete_store_comment", { p_comment_id: id }));
  }

  return (
    <>
      <section aria-labelledby="posts-title" className="flex flex-col gap-2.5">
        <h2 id="posts-title" className="font-display text-[19px] font-normal">실시간 사장님 소식 & 공지</h2>
        {posts.length === 0 ? (
          <div className="flex items-center gap-2.5 rounded-[18px] border-2 border-dashed border-line px-3.5 py-2.5 text-sm text-muted">
            <Osori mood="think" size={40} />
            아직 올라온 소식이 없어요
          </div>
        ) : (
          posts.map((p) => {
            const like = likeOf(p);
            const href = `/stores/${storeId}/posts/${p.id}`;
            return (
              <article key={p.id} className="flex flex-col gap-2.5 rounded-[20px] border-2 border-line bg-card px-4 py-3.5">
                {/* 글을 누르면 전체 화면에서 댓글과 함께 본다 */}
                <Link href={href} className="flex flex-col gap-2">
                  <PostHead post={p} />
                  <PostBody post={p} clamp />
                </Link>
                <div className="flex items-center gap-5 border-t-2 border-line pt-1.5">
                  <LikeButton on={like.on} count={like.count} onClick={() => toggleLike(p)} />
                  <Link href={href} className="flex min-h-11 items-center gap-1.5 text-[15px] font-bold">
                    <CommentIcon />
                    댓글 {p.comment_count}
                  </Link>
                </div>
              </article>
            );
          })
        )}
      </section>

      <section id="comments" aria-labelledby="intro-title" className="flex scroll-mt-4 flex-col gap-2.5 rounded-[22px] border-2 border-line bg-card px-4 py-4">
        <h2 id="intro-title" className="font-display text-[19px] font-normal">소개글 & 주민 소통 공간</h2>
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{intro ?? "아직 소개글이 없어요."}</p>

        <CommentInput
          id="comment-input"
          value={text}
          onChange={setText}
          busy={busy}
          placeholder="따뜻한 한마디를 남겨 주세요"
          onSubmit={() => withSession((s) => s.rpc("post_store_comment", { p_store_id: storeId, p_body: text.trim() }), () => setText(""))}
        />

        {commentCount > 0 && <span className="text-sm font-bold text-muted">주민 댓글 {commentCount}개</span>}
        {comments.length === 0 ? (
          <p className="text-sm text-muted">첫 댓글을 남겨 보세요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {comments.map((c) => (
              <CommentRow key={c.id} body={c.body} at={c.created_at} canDelete={c.is_mine || canManage} busy={busy} onDelete={() => removeComment(c.id)} />
            ))}
          </ul>
        )}
      </section>
      {node}
    </>
  );
}

export function CommentInput({ id, value, onChange, busy, placeholder, onSubmit }: { id: string; value: string; onChange: (v: string) => void; busy: boolean; placeholder: string; onSubmit: () => void }) {
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSubmit();
      }}
    >
      <label className="sr-only" htmlFor={id}>주민 댓글</label>
      <input
        id={id}
        value={value}
        maxLength={COMMENT_MAX}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-12 min-w-0 flex-1 rounded-2xl border-2 border-line bg-white px-3 text-base"
      />
      <button type="submit" disabled={busy || !value.trim()} className="min-h-12 shrink-0 rounded-2xl border-2 border-yellow-deep bg-yellow px-4 font-bold disabled:opacity-50">
        남기기
      </button>
    </form>
  );
}

export function CommentRow({ body, at, canDelete, busy, onDelete }: { body: string; at: string; canDelete: boolean; busy: boolean; onDelete: () => void }) {
  return (
    <li className="flex items-start gap-2 rounded-2xl bg-cream px-3 py-2">
      <span className="min-w-0 flex-1 text-[15px] leading-normal whitespace-pre-wrap">{body}</span>
      <span className="shrink-0 text-xs text-muted">
        <TimeAgo iso={at} />
      </span>
      {canDelete && (
        <button type="button" disabled={busy} onClick={onDelete} className="shrink-0 text-xs font-bold text-[#A4423F] underline">
          지우기
        </button>
      )}
    </li>
  );
}

/** 공감은 누르는 즉시 화면에 반영하고, 저장은 뒤에서 차례로 한다 */
export function usePostLikes(posts: StorePost[], show: (text: string, mood?: "think") => void) {
  const [likes, setLikes] = useState<Record<string, { on: boolean; count: number }>>({});
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => setLikes({}), [posts]);

  const likeOf = (p: StorePost) => likes[p.id] ?? { on: p.liked_by_me, count: p.like_count };

  function toggleLike(p: StorePost) {
    const cur = likeOf(p);
    const next = { on: !cur.on, count: Math.max(0, cur.count + (cur.on ? -1 : 1)) };
    setLikes((m) => ({ ...m, [p.id]: next }));
    queue.current = queue.current.then(async () => {
      try {
        const supabase = createClient();
        await ensureSession(supabase);
        const { error } = await supabase.rpc("toggle_post_like", { p_post_id: p.id, p_on: next.on });
        if (error) throw error;
      } catch (e) {
        setLikes((m) => ({ ...m, [p.id]: cur }));
        show(errorMessage(e), "think");
      }
    });
  }
  return { likeOf, toggleLike };
}

/** 누가 언제 알렸는지를 글 맨 위에 둔다 (공지 표시도 함께) */
export function PostHead({ post }: { post: StorePost }) {
  return (
    <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
      {post.kind === "notice" && <span className="rounded-[10px] bg-yellow px-2 py-0.5 font-display text-[13px] text-ink">공지</span>}
      <span>
        <SourceLine source={post.source} at={post.created_at} />
        {post.updated_at ? " · 수정됨" : ""}
      </span>
    </span>
  );
}

/** 첫 줄은 제목처럼, 나머지는 본문 크기로. clamp 면 목록에서 세 줄까지만 */
export function PostBody({ post, clamp = false }: { post: StorePost; clamp?: boolean }) {
  const { title, rest } = postParts(post.body);
  return (
    <span className="flex gap-3">
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={`text-[17px] leading-snug font-bold whitespace-pre-wrap ${clamp ? "line-clamp-2" : ""}`}>{title}</span>
        {rest && <span className={`text-[15px] leading-relaxed whitespace-pre-wrap ${clamp ? "line-clamp-3" : ""}`}>{rest}</span>}
      </span>
      {post.image_url &&
        (clamp ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.image_url} alt="" loading="lazy" className="size-[88px] shrink-0 rounded-2xl object-cover" />
        ) : null)}
    </span>
  );
}

export function LikeButton({ on, count, onClick }: { on: boolean; count: number; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className="flex min-h-11 items-center gap-1.5 text-[15px] font-bold active:scale-95">
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill={on ? "#D9706F" : "none"} stroke={on ? "#D9706F" : "currentColor"} strokeWidth="2.2" strokeLinejoin="round">
        <path d="M12 20s-7.5-4.6-9.3-9.2C1.5 7.5 3.6 4.5 6.8 4.5c2.2 0 3.9 1.2 5.2 3 1.3-1.8 3-3 5.2-3 3.2 0 5.3 3 4.1 6.3C19.5 15.4 12 20 12 20z" />
      </svg>
      공감 {count}
    </button>
  );
}

export function CommentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
      <path d="M4 5.5h16v11H10l-4.5 3.5V16.5H4z" />
    </svg>
  );
}
