import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { PageView } from "@/components/PageView";
import { PostView } from "@/components/PostView";
import { createClient } from "@/lib/supabase/server";
import type { StoreDetail } from "@/lib/types";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 사장님 소식 하나를 전체 화면으로 보고 댓글을 쓴다 */
export default async function PostPage({ params }: { params: Promise<{ id: string; postId: string }> }) {
  const { id, postId } = await params;
  if (!UUID.test(id) || !UUID.test(postId)) notFound();

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_store_detail", { p_store_id: id });
  const detail = data as StoreDetail | null;
  const post = detail?.posts.find((p) => p.id === postId);
  if (!detail || !post) notFound();

  return (
    <>
      <header className="flex items-center gap-2.5 px-5 pt-4 pb-2">
        <BackButton />
        <Link href={`/stores/${id}`} className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-display text-[21px] leading-tight">{detail.store.name}</span>
          <span className="text-[13px] text-muted">사장님 소식</span>
        </Link>
      </header>
      <main className="flex flex-1 flex-col gap-[18px] px-5 pt-1 pb-4">
        <PostView storeId={id} post={post} canManage={detail.can_manage} />
      </main>
      <PageView name="store_view" storeId={id} />
    </>
  );
}
