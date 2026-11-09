import { BottomNav } from "@/components/BottomNav";
import { Osori } from "@/components/Osori";
import { PageView } from "@/components/PageView";
import { WriteFab } from "@/components/WriteFab";
import { getTopNews } from "@/lib/okinews";
import { createClient } from "@/lib/supabase/server";
import type { FeedItem } from "@/lib/types";
import { CommunityComposer } from "./Community";
import { NewsCards } from "./NewsCards";
import { NewsList, type CommunityPost, type TodayReport } from "./NewsList";

export const dynamic = "force-dynamic";

/** 소통광장: 위는 옥천신문 뉴스, 아래는 동네 이야기와 오늘의 소식 */
export default async function PlazaPage() {
  const supabase = await createClient();
  const [news, feed, reports, posts, auth, admin] = await Promise.all([
    getTopNews(),
    supabase.rpc("get_today_feed", { p_limit: 30 }),
    supabase.rpc("get_today_reports", { p_limit: 30 }),
    supabase.rpc("get_community_posts", { p_limit: 30 }),
    supabase.auth.getUser(),
    supabase.rpc("okc_is_admin"),
  ]);
  const signedIn = !!auth.data.user && !auth.data.user.is_anonymous;

  return (
    <>
      <main className="ok-wide flex flex-1 flex-col gap-4 px-5 pt-5 pb-28">
        <header className="flex items-center gap-3">
          <Osori mood="talk" size={72} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="font-display text-[26px] font-normal">소통광장</h1>
            <p className="text-[13px] text-muted">오늘의 뉴스를 보고, 동네 이야기를 나눠요</p>
          </div>
        </header>

        <section aria-label="옥천신문 오늘의 뉴스" className="flex flex-col gap-2.5">
          <NewsCards news={news} />
        </section>

        <section aria-labelledby="community-title" className="flex flex-col gap-3 pt-1">
          <h2 id="community-title" className="font-display text-[22px] font-normal">동네 이야기</h2>
          <CommunityComposer signedIn={signedIn} />
          <NewsList
            feed={(feed.data ?? []) as FeedItem[]}
            reports={(reports.data ?? []) as TodayReport[]}
            posts={(posts.data ?? []) as CommunityPost[]}
            isAdmin={!!admin.data && signedIn}
          />
        </section>
      </main>
      <WriteFab />
      <BottomNav />
      <PageView />
    </>
  );
}
