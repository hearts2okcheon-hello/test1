"use client";

import Link from "next/link";
import { postHref } from "@/lib/posts";
import type { StorePost } from "@/lib/types";
import { PostBody, PostHead } from "./PostParts";
import { PostShelf } from "./PostShelf";

/**
 * 가게 화면의 사장님 소식 & 공지 (ADR-024, ADR-025). 글이 있을 때만 그린다 (빈 칸을 두지 않는다).
 * 공지는 맨 위에서 옆으로 넘겨 보고, 소식은 그 아래에 새 글부터. 글을 누르면 그 글 화면으로 간다.
 * 공감·댓글은 없다
 */
export function StorePosts({ storeId, posts }: { storeId: string; posts: StorePost[] }) {
  if (posts.length === 0) return null;
  return (
    <section aria-labelledby="posts-title" className="flex flex-col gap-2.5">
      <h2 id="posts-title" className="font-display text-[19px] font-normal">실시간 사장님 소식 & 공지</h2>
      <PostShelf
        posts={posts}
        renderPost={(p) => (
          <Link href={postHref(storeId, p.id)} className="flex flex-col gap-2 rounded-[20px] border-2 border-line bg-card px-4 py-3.5">
            <PostHead post={p} />
            <PostBody post={p} clamp />
          </Link>
        )}
      />
    </section>
  );
}
