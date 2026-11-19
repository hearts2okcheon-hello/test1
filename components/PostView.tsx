"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { askDelete } from "@/lib/confirm";
import { errorMessage } from "@/lib/errors";
import { createClient, ensureSession } from "@/lib/supabase/client";
import type { StorePost } from "@/lib/types";
import { CommentIcon, CommentInput, CommentRow, LikeButton, PostBody, PostHead, usePostLikes } from "./StoreSocial";
import { useToast } from "./Toast";

/** 사장님 소식 하나를 전체 화면으로: 글 · 공감 · 모든 댓글 · 아래에 붙은 댓글 쓰기 */
export function PostView({ storeId, post, canManage }: { storeId: string; post: StorePost; canManage: boolean }) {
  const router = useRouter();
  const { node, show } = useToast();
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const posts = useMemo(() => [post], [post]);
  const { likeOf, toggleLike } = usePostLikes(posts, show);
  const like = likeOf(post);

  async function run(action: (s: ReturnType<typeof createClient>) => PromiseLike<{ error: unknown }>, done?: () => void) {
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

  async function remove(id: string) {
    if (await askDelete({ detail: "이 댓글이 사라져요." })) run((s) => s.rpc("delete_store_comment", { p_comment_id: id }));
  }

  return (
    <>
      <article className="flex flex-col gap-3 rounded-[22px] border-2 border-line bg-card px-4 py-4">
        <PostHead post={post} />
        <PostBody post={post} />
        {post.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.image_url} alt="" className="max-h-[420px] w-full rounded-2xl object-cover" />
        )}
        <div className="flex items-center gap-5 border-t-2 border-line pt-1.5">
          <LikeButton on={like.on} count={like.count} onClick={() => toggleLike(post)} />
          <span className="flex min-h-11 items-center gap-1.5 text-[15px] font-bold">
            <CommentIcon />
            댓글 {post.comment_count}
          </span>
        </div>
      </article>

      <section aria-labelledby="post-comments" className="flex flex-col gap-2.5">
        <h2 id="post-comments" className="font-display text-[19px] font-normal">이웃 댓글</h2>
        {post.comments.length === 0 ? (
          <p className="rounded-[18px] border-2 border-dashed border-line px-4 py-3 text-sm text-muted">아직 댓글이 없어요. 첫 댓글을 남겨 보세요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {post.comments.map((c) => (
              <CommentRow key={c.id} onPaper body={c.body} at={c.created_at} canDelete={c.is_mine || canManage} busy={busy} onDelete={() => remove(c.id)} />
            ))}
          </ul>
        )}
      </section>

      <div className="sticky bottom-0 z-20 -mx-5 mt-auto bg-paper px-5 pt-2.5 pb-[max(16px,env(safe-area-inset-bottom))]">
        <CommentInput
          id="post-comment-input"
          value={text}
          onChange={setText}
          busy={busy}
          placeholder="이 소식에 댓글 달기"
          onSubmit={() => run((s) => s.rpc("post_store_comment", { p_store_id: storeId, p_body: text.trim(), p_post_id: post.id }), () => setText(""))}
        />
      </div>
      {node}
    </>
  );
}
