"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { askDelete } from "@/lib/confirm";
import { errorMessage } from "@/lib/errors";
import { goBackRefreshed } from "@/lib/nav";
import { postActions, postEditHref } from "@/lib/posts";
import { createClient } from "@/lib/supabase/client";
import type { StorePost } from "@/lib/types";
import { MoreMenu, type MoreItem } from "./MoreMenu";
import { PostBody, PostHead } from "./PostParts";
import { useToast } from "./Toast";

/**
 * 사장님 소식 하나를 전체 화면으로 (ADR-025): 글과 사진, 그 아래 가게로 가는 줄.
 * 이 가게를 고칠 수 있는 사람(사장님·옥천신문)에게는 글 오른쪽 위에 점 세 개 메뉴(수정 · 삭제)가 보인다.
 * 공감·댓글은 없다
 */
export function PostView({ storeId, storeName, post, canManage }: { storeId: string; storeName: string; post: StorePost; canManage: boolean }) {
  const router = useRouter();
  const { node, show } = useToast();

  async function remove() {
    if (!(await askDelete({ detail: "이 소식이 사라져요." }))) return;
    const { error } = await createClient().rpc("delete_store_post", { p_post_id: post.id });
    if (error) return show(errorMessage(error), "think");
    // 지운 글 화면에 머물 수 없다: 들어온 화면(소통광장·가게·내 가게)으로 돌아간다
    goBackRefreshed(router, `/stores/${storeId}`);
  }

  const items: MoreItem[] = postActions({ mine: canManage }).map((a) =>
    a === "edit" ? { label: "수정", href: postEditHref(storeId, post.id) } : { label: "삭제", onSelect: remove, danger: true },
  );

  return (
    <>
      <article className="relative flex flex-col gap-3 rounded-[22px] border-2 border-line bg-card px-4 py-4">
        <MoreMenu label="글 메뉴" items={items} className="!absolute top-1.5 right-1.5" />
        {/* 점 세 개 자리만큼 오른쪽을 비운다 */}
        <span className={items.length > 0 ? "pr-10" : ""}>
          <PostHead post={post} />
        </span>
        <PostBody post={post} />
        {post.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.image_url} alt="" className="max-h-[420px] w-full rounded-2xl object-cover" />
        )}
      </article>

      <Link href={`/stores/${storeId}`} className="flex min-h-14 items-center gap-2 rounded-[20px] border-2 border-line bg-card px-4">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[13px] text-muted">이 소식을 올린 가게</span>
          <span className="truncate font-display text-lg leading-snug">{storeName}</span>
        </span>
        <span className="shrink-0 text-sm font-bold">가게 보기</span>
        <span aria-hidden className="text-xl text-muted">›</span>
      </Link>
      {node}
    </>
  );
}
