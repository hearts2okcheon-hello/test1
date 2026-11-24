import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { FavoriteList } from "@/components/FavoriteList";
import { StoreArticlesProvider } from "@/components/StoreArticles";
import { createClient } from "@/lib/supabase/server";
import type { StoreArticle, StoreSign } from "@/lib/types";

export const dynamic = "force-dynamic";

/** 내 공간 → 즐겨찾는 가게: 별을 누른 가게들의 지금 모습을 모아 본다 */
export default async function FavoritesPage() {
  const supabase = await createClient();
  const [signs, favs, articles] = await Promise.all([supabase.rpc("get_store_signs"), supabase.rpc("get_my_favorites"), supabase.rpc("get_store_articles")]);
  const stores = (signs.data ?? []) as StoreSign[];
  const favoriteIds = ((favs.data ?? []) as string[]).map(String);

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 px-[18px] pt-4 pb-5">
        <header className="flex items-center gap-2.5">
          <Link href="/owner" aria-label="내 공간으로 돌아가기" className="flex size-[46px] shrink-0 items-center justify-center rounded-full border-2 border-line bg-card">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
          <h1 className="font-display text-[23px] font-normal">즐겨찾는 가게</h1>
        </header>
        <StoreArticlesProvider articles={(articles.data ?? []) as StoreArticle[]}>
          <FavoriteList stores={stores} initialIds={favoriteIds} />
        </StoreArticlesProvider>
      </main>
      <BottomNav />
    </>
  );
}
