import { notFound, redirect } from "next/navigation";
import { PostComposer } from "@/components/PostComposer";
import { postHref } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";
import type { StoreDetail } from "@/lib/types";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 사장님 소식 하나를 고치는 화면 (ADR-025). 글의 점 세 개 메뉴 → 수정, 내 가게의 "고치기"에서 온다.
 * 가게를 고칠 수 있는 사람만 들어온다. 아니면 글 화면으로 돌려보낸다 (마지막 권한 검사는 save_store_post 가 다시 한다)
 */
export default async function PostEditPage({ params }: { params: Promise<{ id: string; postId: string }> }) {
  const { id, postId } = await params;
  if (!UUID.test(id) || !UUID.test(postId)) notFound();

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_store_detail", { p_store_id: id });
  const detail = data as StoreDetail | null;
  const post = detail?.posts.find((p) => p.id === postId);
  if (!detail || !post) notFound();
  if (!detail.can_manage) redirect(postHref(id, postId));

  return (
    <main className="flex flex-1 flex-col gap-4 px-[18px] pt-4 pb-6">
      <PostComposer storeId={id} storeName={detail.store.name} post={post} />
    </main>
  );
}
