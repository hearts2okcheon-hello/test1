import Image from "next/image";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { CategoryIcon } from "@/components/CategoryIcon";
import { PageView } from "@/components/PageView";
import { TimeAgo } from "@/components/TimeAgo";
import { WriteFab } from "@/components/WriteFab";
import { CATEGORIES, categoryOf } from "@/lib/categories";
import { feedLine, latestPerStore } from "@/lib/signs";
import { createClient } from "@/lib/supabase/server";
import type { FeedItem, StoreSign } from "@/lib/types";
import { HomeFavorites } from "./HomeFavorites";
import { HomeSearch } from "./HomeSearch";

export const dynamic = "force-dynamic";

const BROADCAST_CARDS = 8;
const CARD = "ok-sticker w-[78%] max-w-[320px] shrink-0 snap-start scroll-ml-5 rounded-[24px] border-2 border-line bg-card px-4 py-3";

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
  const broadcasts = latestPerStore(feed.filter((f) => f.is_current)).slice(0, BROADCAST_CARDS);
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
          <span className="ok-sticker inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-line bg-card px-3.5 py-2 font-display text-[15px]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            옥천읍
          </span>
        </header>

        <HomeSearch stores={stores} menus={menus}>
          {/* 오늘의 마을방송: 옆으로 넘겨 본다 */}
          <section aria-label="오늘의 마을방송" className="-mx-5">
            <div className="ok-scroll-x flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pt-1 pb-2">
              {broadcasts.length === 0 ? (
                <div className={`${CARD} flex items-center gap-2.5`}>
                  <p className="font-display text-[17px] leading-snug">아직 오늘 방송이 없어요. 사장님들 소식을 기다리는 중!</p>
                </div>
              ) : (
                broadcasts.map((f) => (
                  <Link key={`${f.item_type}-${f.item_id}`} href={`/stores/${f.store_id}`} className={`${CARD} flex min-h-[112px] items-center gap-2.5`}>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate font-display text-[18px]">{f.store_name}</span>
                      <span className="line-clamp-2 text-[15px] leading-snug">{feedLine(f)}</span>
                      <span className="text-[13px] text-muted">
                        {f.source === "owner" ? "사장님" : "옥천신문"} · <TimeAgo iso={f.created_at} />
                      </span>
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>

          <HomeFavorites stores={stores} initialIds={favoriteIds} />

          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-[22px] font-normal">무엇을 찾아요?</h2>
            <span className="text-sm text-muted">
              지금 문 연 가게 <b className="text-[#2F6E3B]">{openTotal}곳</b>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-x-2.5 gap-y-3 min-[560px]:grid-cols-[repeat(auto-fill,minmax(100px,1fr))]">
            {CATEGORIES.map((c) => (
              <Link key={c.id} href={`/stores?cat=${c.id}`} className="ok-sticker flex flex-col items-center gap-1.5 rounded-[22px] border-2 border-line bg-card px-0.5 pt-3 pb-2.5">
                <span className="flex size-[60px] items-center justify-center rounded-full border-2 border-white" style={{ background: c.bg, boxShadow: `0 0 0 2px ${c.bg}` }}>
                  <CategoryIcon id={c.id} />
                </span>
                <span className="font-display text-[15px] whitespace-nowrap">{c.name}</span>
                <span className="text-[11px] font-bold text-[#2F6E3B]">영업중 {stores.filter((s) => categoryOf(s.category) === c.id && isOpen(s)).length}</span>
              </Link>
            ))}
          </div>
        </HomeSearch>
      </main>

      <WriteFab />
      <BottomNav />
      <PageView />
    </>
  );
}
