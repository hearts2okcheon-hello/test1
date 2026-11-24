import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { PageView } from "@/components/PageView";
import { PostView } from "@/components/PostView";
import { createClient } from "@/lib/supabase/server";
import type { StoreDetail } from "@/lib/types";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 사장님 소식 하나를 전체 화면으로 본다. 소통광장·홈·가게 화면에서 글을 누르면 여기로 온다 (ADR-025) */
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
        <BackButton fallback={`/stores/${id}`} />
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate font-display text-[21px] leading-tight font-normal">사장님 소식</h1>
          <span className="truncate text-[13px] text-muted">{detail.store.name}</span>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-[18px] px-5 pt-1 pb-6">
        <PostView storeId={id} storeName={detail.store.name} post={post} canManage={detail.can_manage} />
      </main>
      <PageView name="store_view" storeId={id} />
    </>
  );
}
