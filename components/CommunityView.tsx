"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useCommunityLikes, type CommunityPost } from "@/app/news/NewsList";
import { askDelete } from "@/lib/confirm";
import { errorMessage } from "@/lib/errors";
import { goBackRefreshed } from "@/lib/nav";
import { postActions, storyEditHref } from "@/lib/posts";
import { createClient } from "@/lib/supabase/client";
import { MoreMenu, type MoreItem } from "./MoreMenu";
import { CommentIcon, LikeButton } from "./PostParts";
import { TimeAgo } from "./TimeAgo";
import { useToast } from "./Toast";

/**
 * 동네 이야기 하나를 전체 화면으로: 글 · 공감 · 모든 댓글 · 아래에 붙은 댓글 쓰기.
 * 댓글은 카카오 로그인한 사람만 쓰고, 화면에는 익명으로 보인다 (ADR-012).
 * 내가 쓴 글이면 오른쪽 위 점 세 개 메뉴로 수정·삭제한다 (관리자는 남의 글도 삭제만, ADR-025)
 */
export function CommunityView({ post, signedIn, isAdmin }: { post: CommunityPost; signedIn: boolean; isAdmin: boolean }) {
  const router = useRouter();
  const { node, show } = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const posts = useMemo(() => [post], [post]);
  const { likeOf, toggleLike } = useCommunityLikes(posts, show);
  const like = likeOf(post);

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

  async function removePost() {
    if (!(await askDelete({ detail: "이 글이 사라져요." }))) return;
    const { error } = await createClient().rpc("delete_community_post", { p_post_id: post.id });
    if (error) return show(errorMessage(error), "think");
    // 지운 글 화면에 머물 수 없다: 들어온 화면(소통광장의 보던 자리)으로 돌아간다
    goBackRefreshed(router, "/news?tab=community");
  }

  const items: MoreItem[] = postActions({ mine: post.is_mine, admin: isAdmin }).map((a) =>
    a === "edit" ? { label: "수정", href: storyEditHref(post.id) } : { label: "삭제", onSelect: removePost, danger: true },
  );

  return (
    <>
      <article className="relative flex flex-col gap-3 rounded-[22px] border-2 border-line bg-card px-4 py-4">
        <MoreMenu label="글 메뉴" items={items} className="!absolute top-1.5 right-1.5" />
        {/* 점 세 개 자리만큼 오른쪽을 비운다 */}
        <span className={`flex items-center gap-2 text-[13px] text-muted ${items.length > 0 ? "pr-10" : ""}`}>
          <span className="rounded-full bg-sage-soft px-2.5 py-[3px] text-[12px] font-bold text-sage-deep">동네 이야기</span>
          <b>{post.anon_name}</b>
          <TimeAgo iso={post.created_at} />
        </span>
        <p className="text-[17px] leading-relaxed break-words break-keep whitespace-pre-wrap">{post.body}</p>
        <div className="flex items-center gap-5 border-t-2 border-line pt-1.5">
          <LikeButton on={like.on} count={like.count} onClick={() => toggleLike(post)} />
          <span className="flex min-h-11 items-center gap-1.5 text-[15px] font-bold">
            <CommentIcon />
            댓글 {post.comment_count}
          </span>
          {/* 글쓴이가 내용을 고친 글 (목록과 같은 자리) */}
          {post.updated_at && <span className="ml-auto text-[13px] text-muted">수정됨</span>}
        </div>
      </article>

      <section aria-labelledby="community-comments" className="flex flex-col gap-2.5">
        <h2 id="community-comments" className="font-display text-[19px] font-normal">댓글</h2>
        {post.comments.length === 0 ? (
          <p className="rounded-[18px] border-2 border-dashed border-line px-4 py-3 text-sm text-muted">아직 댓글이 없어요. 첫 댓글을 남겨 보세요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {post.comments.map((c) => (
              <li key={c.id} className="flex flex-col gap-0.5 rounded-2xl border-2 border-line bg-card px-3.5 py-2.5">
                <span className="flex items-center gap-2 text-[13px]">
                  <b className={c.anon_name === "글쓴이" ? "text-sage-deep" : "text-muted"}>{c.anon_name}</b>
                  <span className="text-muted"><TimeAgo iso={c.created_at} /></span>
                  {(c.is_mine || isAdmin) && (
                    <button type="button" onClick={() => removeComment(c.id)} className="-my-2 -mr-1.5 ml-auto flex min-h-11 items-center px-1.5 text-[13px] font-bold text-danger underline">
                      지우기
                    </button>
                  )}
                </span>
                <span className="text-[15px] leading-normal break-words whitespace-pre-wrap">{c.body}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="sticky bottom-0 z-20 -mx-5 mt-auto bg-paper px-5 pt-2.5 pb-[max(16px,env(safe-area-inset-bottom))]">
        {signedIn ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <label className="sr-only" htmlFor="community-comment">댓글</label>
            <input id="community-comment" value={text} maxLength={200} onChange={(e) => setText(e.target.value)} placeholder="익명으로 댓글 달기" className="min-h-12 min-w-0 flex-1 rounded-2xl border-2 border-line bg-white px-3 text-base" />
            <button type="submit" disabled={busy || !text.trim()} className="min-h-12 shrink-0 rounded-2xl border-2 border-yellow-deep bg-yellow px-4 font-bold disabled:opacity-50">
              남기기
            </button>
          </form>
        ) : (
          <a href={`/auth/kakao?next=/news/${post.id}`} className="flex min-h-12 items-center justify-center rounded-2xl bg-[#FEE500] text-base font-bold text-black/85">
            카카오로 로그인하고 댓글 달기
          </a>
        )}
      </div>
      {node}
    </>
  );
}
