import Image from "next/image";
import { BottomNav } from "@/components/BottomNav";
import { HomePager } from "@/components/HomePager";
import { InstallButton } from "@/components/InstallButton";
import { LiveRefresh } from "@/components/LiveRefresh";
import { PageView } from "@/components/PageView";
import { StoreArticlesProvider } from "@/components/StoreArticles";
import { createClient } from "@/lib/supabase/server";
import type { FeedItem, StoreArticle, StoreSign } from "@/lib/types";
import { HomeSearch } from "./HomeSearch";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const [feedRes, signsRes, indexRes, favRes, articlesRes] = await Promise.all([
    supabase.rpc("get_today_feed", { p_limit: 50 }),
    supabase.rpc("get_store_signs"),
    supabase.rpc("get_store_search_index"),
    supabase.rpc("get_my_favorites"),
    supabase.rpc("get_store_articles"),
  ]);
  const favoriteIds = ((favRes.data ?? []) as string[]).map(String);
  const feed = (feedRes.data ?? []) as FeedItem[];
  const stores = (signsRes.data ?? []) as StoreSign[];
  const menus = Object.fromEntries(((indexRes.data ?? []) as { store_id: string; menus: string[] }[]).map((r) => [r.store_id, r.menus]));

  return (
    <>
      {/* 옆으로 미는 손짓은 카테고리 넘기기에 쓴다. 위아래 스크롤과 확대는 그대로 */}
      <main className="ok-wide flex flex-1 touch-pan-y touch-pinch-zoom flex-col gap-5 px-5 pt-5 pb-28">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-end gap-2.5">
            <Image unoptimized src="/logo.webp" alt="OK!소리" width={115} height={72} priority className="h-[72px] w-auto" />
            <span className="hidden font-display text-[15px] text-muted min-[400px]:inline">주머니 속 마을방송</span>
          </div>
          <InstallButton />
        </header>

        {/* 옥천신문이 기사를 붙인 가게는 가게 칸에서 기사를 펼쳐 볼 수 있다 (ADR-020) */}
        <StoreArticlesProvider articles={(articlesRes.data ?? []) as StoreArticle[]}>
          <HomeSearch stores={stores} menus={menus}>
            {/* 카테고리 탭(맨 왼쪽 전체)과 그 탭의 가게 */}
            <HomePager feed={feed} stores={stores} favoriteIds={favoriteIds} />
          </HomeSearch>
        </StoreArticlesProvider>
      </main>

      <BottomNav />
      <PageView />
      <LiveRefresh />
    </>
  );
}
