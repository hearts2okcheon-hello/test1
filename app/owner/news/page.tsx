import { redirect } from "next/navigation";
import { PostComposer } from "@/components/PostComposer";
import { manageableStore } from "@/lib/owner";
import { postEditHref } from "@/lib/posts";

export const dynamic = "force-dynamic";

/** 소식·공지 쓰기. 예전 주소(?id=)로 고치러 들어오면 그 글을 고치는 화면으로 보낸다 (ADR-025) */
export default async function NewsPage({ searchParams }: { searchParams: Promise<{ id?: string; store?: string }> }) {
  const { id, store } = await searchParams;
  const detail = await manageableStore(store);
  if (!detail) redirect("/owner");
  if (id && detail.posts.some((p) => p.id === id)) redirect(postEditHref(detail.store.store_id, id));

  return (
    <main className="flex flex-1 flex-col gap-4 px-[18px] pt-4 pb-6">
      <PostComposer storeId={detail.store.store_id} storeName={detail.store.name} post={null} />
    </main>
  );
}
