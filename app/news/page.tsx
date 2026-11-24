import { BottomNav } from "@/components/BottomNav";
import { Osori } from "@/components/Osori";
import { PageView } from "@/components/PageView";
import { WriteFab } from "@/components/WriteFab";
import { NEWS_DAYS, getRecentNews } from "@/lib/okinews";
import { plazaTab } from "@/lib/plaza";
import { createClient } from "@/lib/supabase/server";
import type { FeedItem } from "@/lib/types";
import type { NewsStat } from "./NewsCards";
import { NewsList, type CommunityPost, type TodayReport } from "./NewsList";

export const dynamic = "force-dynamic";

/**
 * 소통광장 (ADR-018): 동네 이야기 하나로, 그 안의 줄에서 옥천신문(최근 기사) · 동네 이야기 · 사장님 소식 · 이웃 제보를 고른다.
 * ?tab= 으로 처음 열 줄을 정할 수 있다
 */
export default async function PlazaPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const supabase = await createClient();
  const [recent, feed, reports, posts, auth, admin, owner] = await Promise.all([
    getRecentNews(),
    supabase.rpc("get_today_feed", { p_limit: 30 }),
    supabase.rpc("get_today_reports", { p_limit: 30 }),
    supabase.rpc("get_community_posts", { p_limit: 30 }),
    supabase.auth.getUser(),
    supabase.rpc("okc_is_admin"),
    supabase.rpc("okc_owner_mode"),
  ]);
  const signedIn = !!auth.data.user && !auth.data.user.is_anonymous;
  const stats = recent.news.length > 0 ? await supabase.rpc("get_news_stats", { p_article_ids: recent.news.map((n) => n.id) }) : { data: [] };

  return (
    <>
      <main className="ok-wide flex flex-1 flex-col gap-4 px-5 pt-5 pb-28">
        <header className="flex items-center gap-3">
          <Osori mood="talk" size={72} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="font-display text-[26px] font-normal">소통광장</h1>
            <p className="text-[13px] text-muted">옥천신문 기사를 보고, 동네 이야기를 나눠요</p>
          </div>
        </header>

        <section aria-labelledby="community-title" className="flex flex-col gap-3">
          <h2 id="community-title" className="font-display text-[22px] font-normal">동네 이야기</h2>
          <NewsList
            feed={(feed.data ?? []) as FeedItem[]}
            reports={(reports.data ?? []) as TodayReport[]}
            posts={(posts.data ?? []) as CommunityPost[]}
            isAdmin={!!admin.data && signedIn}
            news={recent.news}
            stats={(stats.data ?? []) as NewsStat[]}
            newsLoaded={recent.loaded}
            newsDays={NEWS_DAYS}
            initialTab={plazaTab(tab)}
          />
        </section>
      </main>
      {/* 사장님 소식 쓰기는 가게를 등록하는(한) 사람에게만 보인다 (ADR-019) */}
      <WriteFab owner={owner.data === true} />
      <BottomNav />
      <PageView />
    </>
  );
}
