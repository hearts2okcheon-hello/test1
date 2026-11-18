import Image from "next/image";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { CategoryIcon } from "@/components/CategoryIcon";
import { InstallButton } from "@/components/InstallButton";
import { LiveRefresh } from "@/components/LiveRefresh";
import { PageView } from "@/components/PageView";
import { TimeAgo } from "@/components/TimeAgo";
import { CATEGORIES, categoryOf } from "@/lib/categories";
import { feedLine, latestPerStore } from "@/lib/signs";
import { createClient } from "@/lib/supabase/server";
import type { FeedItem, StoreSign } from "@/lib/types";
import { HomeFavorites } from "./HomeFavorites";
import { HomeSearch } from "./HomeSearch";

export const dynamic = "force-dynamic";

const LIVE_ROWS = 5;

export default async function HomePage() {
  const supabase = await createClient();
  const [feedRes, signsRes, indexRes, favRes] = await Promise.all([
    supabase.rpc("get_today_feed", { p_limit: 50 }),
    supabase.rpc("get_store_signs"),
    supabase.rpc("get_store_search_index"),
    supabase.rpc("get_my_favorites"),
  ]);
  const favoriteIds = ((favRes.data ?? []) as string[]).map(String);
  const feed = (feedRes.data ?? []) as FeedItem[];
  const stores = (signsRes.data ?? []) as StoreSign[];
  const menus = Object.fromEntries(((indexRes.data ?? []) as { store_id: string; menus: string[] }[]).map((r) => [r.store_id, r.menus]));
  // 실시간 소식: 가게마다 가장 새 소식 하나씩, 새로 올라온 순서로
  const live = latestPerStore(feed.filter((f) => f.is_current)).slice(0, LIVE_ROWS);
  const isOpen = (s: StoreSign) => s.schedule_status === "open";
  const openTotal = stores.filter(isOpen).length;

  return (
    <>
      <main className="ok-wide flex flex-1 flex-col gap-5 px-5 pt-5 pb-28">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-end gap-2.5">
            <Image unoptimized src="/logo.webp" alt="OK!소리" width={115} height={72} priority className="h-[72px] w-auto" />
            <span className="hidden font-display text-[15px] text-muted min-[400px]:inline">주머니 속 마을방송</span>
          </div>
          <InstallButton />
        </header>

        <HomeSearch stores={stores} menus={menus}>
          {/* 실시간 마을방송: 방금 올라온 소식이 위에서부터 쌓인다 */}
          <section aria-labelledby="live-title" className="flex flex-col gap-2.5">
            <h2 id="live-title" className="flex items-center gap-2 font-display text-[19px] font-normal">
              <span aria-hidden className="size-2.5 rounded-full bg-coral" />
              실시간 마을방송
            </h2>
            {live.length === 0 ? (
              <p className="rounded-[20px] border-2 border-dashed border-line px-4 py-3.5 text-[15px] text-muted">아직 오늘 방송이 없어요. 사장님들 소식을 기다리는 중!</p>
            ) : (
              <ul className="ok-sticker flex flex-col rounded-[22px] border-2 border-line bg-card px-4">
                {live.map((f, i) => (
                  <li key={`${f.item_type}-${f.item_id}`} className={i > 0 ? "border-t-2 border-line" : ""}>
                    <Link href={f.item_type === "post" ? `/stores/${f.store_id}/posts/${f.item_id}` : `/stores/${f.store_id}`} className="flex flex-col gap-0.5 py-3">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-display text-base">{f.store_name}</span>
                        <span className="shrink-0 text-xs text-muted">
                          {f.source === "owner" ? "사장님" : "옥천신문"} · <TimeAgo iso={f.created_at} />
                        </span>
                      </span>
                      <span className="line-clamp-2 text-[15px] leading-snug">{feedLine(f)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <HomeFavorites stores={stores} initialIds={favoriteIds} />

          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-[19px] font-normal">무엇을 찾아요?</h2>
            <span className="text-sm text-muted">
              지금 문 연 가게 <b className="text-open">{openTotal}곳</b>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-x-2.5 gap-y-3 min-[560px]:grid-cols-[repeat(auto-fill,minmax(100px,1fr))]">
            {CATEGORIES.map((c) => (
              <Link key={c.id} href={`/stores?cat=${c.id}`} className="ok-sticker flex flex-col items-center gap-1.5 rounded-[22px] border-2 border-line bg-card px-0.5 pt-3 pb-2.5">
                <span className="flex size-[60px] items-center justify-center rounded-full border-2 border-white" style={{ background: c.bg, boxShadow: `0 0 0 2px ${c.bg}` }}>
                  <CategoryIcon id={c.id} />
                </span>
                <span className="font-display text-[15px] whitespace-nowrap">{c.name}</span>
                <span className="text-[11px] font-bold text-open">영업중 {stores.filter((s) => categoryOf(s.category) === c.id && isOpen(s)).length}</span>
              </Link>
            ))}
          </div>
        </HomeSearch>
      </main>

      <BottomNav />
      <PageView />
      <LiveRefresh />
    </>
  );
}
