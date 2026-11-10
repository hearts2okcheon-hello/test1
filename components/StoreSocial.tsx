"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  const [openPost, setOpenPost] = useState<string | null>(null);
  const [postText, setPostText] = useState("");
  // 공감은 누르는 즉시 화면에 반영하고, 저장은 뒤에서 차례로 한다
  const [likes, setLikes] = useState<Record<string, { on: boolean; count: number }>>({});
  const likeQueue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => setLikes({}), [posts]);

  function toggleLike(p: StorePost) {
    const cur = likes[p.id] ?? { on: p.liked_by_me, count: p.like_count };
    const next = { on: !cur.on, count: Math.max(0, cur.count + (cur.on ? -1 : 1)) };
    setLikes((m) => ({ ...m, [p.id]: next }));
    likeQueue.current = likeQueue.current.then(async () => {
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
        <h2 id="posts-title" className="font-display text-[21px] font-normal">실시간 사장님 소식 & 공지</h2>
        {posts.length === 0 ? (
          <div className="flex items-center gap-2.5 rounded-[18px] border-2 border-dashed border-line px-3.5 py-2.5 text-sm text-muted">
            <Osori mood="think" size={40} />
            아직 올라온 소식이 없어요
          </div>
        ) : (
          posts.map((p) => {
            const like = likes[p.id] ?? { on: p.liked_by_me, count: p.like_count };
            return (
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
                  aria-pressed={like.on}
                  onClick={() => toggleLike(p)}
                  className="flex min-h-11 items-center gap-1.5 text-base font-bold active:scale-95"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden fill={like.on ? "#D9706F" : "none"} stroke={like.on ? "#D9706F" : "currentColor"} strokeWidth="2.2" strokeLinejoin="round">
                    <path d="M12 20s-7.5-4.6-9.3-9.2C1.5 7.5 3.6 4.5 6.8 4.5c2.2 0 3.9 1.2 5.2 3 1.3-1.8 3-3 5.2-3 3.2 0 5.3 3 4.1 6.3C19.5 15.4 12 20 12 20z" />
                  </svg>
                  공감 {like.count}
                </button>
                <button
                  type="button"
                  aria-expanded={openPost === p.id}
                  onClick={() => {
                    setOpenPost(openPost === p.id ? null : p.id);
                    setPostText("");
                  }}
                  className="flex min-h-11 items-center gap-1.5 text-base font-bold"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
                    <path d="M4 5.5h16v11H10l-4.5 3.5V16.5H4z" />
                  </svg>
                  댓글 {p.comment_count}
                </button>
              </div>
              {openPost === p.id && (
                <div className="flex flex-col gap-2">
                  {p.comments.length > 0 && (
                    <ul className="flex flex-col gap-1.5">
                      {p.comments.map((c) => (
                        <CommentRow key={c.id} body={c.body} at={c.created_at} canDelete={c.is_mine || canManage} busy={busy} onDelete={() => removeComment(c.id)} />
                      ))}
                    </ul>
                  )}
                  <CommentInput
                    id={`post-comment-${p.id}`}
                    value={postText}
                    onChange={setPostText}
                    busy={busy}
                    placeholder="이 소식에 댓글 달기"
                    onSubmit={() => withSession((s) => s.rpc("post_store_comment", { p_store_id: storeId, p_body: postText.trim(), p_post_id: p.id }), () => setPostText(""))}
                  />
                </div>
              )}
            </article>
            );
          })
        )}
      </section>

      <section id="comments" aria-labelledby="intro-title" className="flex scroll-mt-4 flex-col gap-2.5 rounded-[22px] border-2 border-line bg-card px-3.5 py-3.5">
        <h2 id="intro-title" className="font-display text-[21px] font-normal">소개글 & 주민 소통 공간</h2>
        <p className="text-base leading-relaxed whitespace-pre-wrap">{intro ?? "아직 소개글이 없어요."}</p>

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

function CommentInput({ id, value, onChange, busy, placeholder, onSubmit }: { id: string; value: string; onChange: (v: string) => void; busy: boolean; placeholder: string; onSubmit: () => void }) {
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

function CommentRow({ body, at, canDelete, busy, onDelete }: { body: string; at: string; canDelete: boolean; busy: boolean; onDelete: () => void }) {
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
