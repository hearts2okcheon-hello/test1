import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { CategorySwipe } from "@/components/CategorySwipe";
import { PageView } from "@/components/PageView";
import { WriteFab } from "@/components/WriteFab";
import { categoryById, categoryOf } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";
import type { StoreSign } from "@/lib/types";
import { StoreList } from "./StoreList";

export const dynamic = "force-dynamic";

/** 가게 목록. 홈의 "더 보기"에서 들어온다. 카테고리 줄은 홈 탭과 같은 순서(전체 · 카페 · 한식 …) */
export default async function StoresPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const category = categoryById(cat);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_store_signs");
  const all = (data ?? []) as StoreSign[];
  const stores = category ? all.filter((s) => categoryOf(s.category) === category.id) : all;

  return (
    <>
      <main className="ok-wide flex flex-1 flex-col gap-4 px-5 pt-5 pb-28">
        <header className="flex items-center gap-1.5">
          <Link href="/" aria-label="홈으로" className="-ml-2.5 flex size-11 items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </Link>
          <h1 className="font-display text-[26px] font-normal">{category?.name ?? "전체 가게"}</h1>
        </header>
        <CategorySwipe current={category?.id ?? "all"} />
        {error ? (
          <p className="rounded-[22px] border-2 border-dashed border-line px-4 py-3 text-sm text-muted">가게 소식을 불러오지 못했어요. 잠시 뒤 새로고침 해 주세요.</p>
        ) : (
          <div id="store-list" className="flex flex-col gap-4">
            <StoreList key={category?.id ?? "all"} stores={stores} />
          </div>
        )}
      </main>
      <WriteFab />
      <BottomNav />
      <PageView />
    </>
  );
}
