import { redirect } from "next/navigation";
import { PostComposer } from "@/components/PostComposer";
import { manageableStore } from "@/lib/owner";

export const dynamic = "force-dynamic";

/** 소식·공지 쓰기. ?id= 가 있으면 고치기 */
export default async function NewsPage({ searchParams }: { searchParams: Promise<{ id?: string; store?: string }> }) {
  const { id, store } = await searchParams;
  const detail = await manageableStore(store);
  if (!detail) redirect("/owner");
  const post = id ? (detail.posts.find((p) => p.id === id) ?? null) : null;

  return (
    <main className="flex flex-1 flex-col gap-4 px-[18px] pt-4 pb-6">
      <PostComposer storeId={detail.store.store_id} storeName={detail.store.name} post={post} />
    </main>
  );
}
